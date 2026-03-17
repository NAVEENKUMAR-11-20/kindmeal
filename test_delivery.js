const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const foodSchema = new mongoose.Schema({
  status: String
});
const requestSchema = new mongoose.Schema({
  food: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodPost' },
  status: String
});

const FoodPost = mongoose.model('FoodPost', foodSchema);
const Request = mongoose.model('Request', requestSchema);

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected');

  // Find an accepted request
  const req = await Request.findOne({ status: 'accepted' }).populate('food');
  if (!req) {
    console.log('No accepted request found');
    process.exit(0);
  }

  console.log(`Found request ${req._id} for food ${req.food._id} with status ${req.food.status}`);

  // Mark as completed
  const status = 'completed';
  const updatedReq = await Request.findByIdAndUpdate(req._id, { status }, { new: true }).populate('food');
  
  if (status === 'completed') {
    await FoodPost.findByIdAndUpdate(updatedReq.food._id, { status: 'delivered' });
  }

  const finalFood = await FoodPost.findById(updatedReq.food._id);
  console.log(`Final food status: ${finalFood.status}`);

  process.exit(0);
}

test();

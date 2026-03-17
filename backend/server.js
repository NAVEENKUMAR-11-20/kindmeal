const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Socket.io for Real-time
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('new_food_posted', (data) => {
    console.log('New food post received:', data);
    socket.broadcast.emit('new_food_available', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// ─── MongoDB ──────────────────────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err.message));

// ─── Models ───────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['provider', 'orphanage'], required: true },
  phone: String,
  address: String,
  googleId: String,
  location: { lat: Number, lng: Number },
}, { timestamps: true });

const foodSchema = new mongoose.Schema({
  title: { type: String, required: true },
  type: { type: String, enum: ['Vegetarian', 'Non-Vegetarian'], default: 'Vegetarian' },
  quantity: { type: String, required: true },
  expiryTime: { type: Date, required: true },
  address: String,
  mobileNumber: String,
  location: { lat: Number, lng: Number },
  notes: String,
  imageUrl: String,
  status: { type: String, enum: ['available', 'requested', 'accepted', 'picked', 'delivered'], default: 'available' },
  provider: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

const requestSchema = new mongoose.Schema({
  food: { type: mongoose.Schema.Types.ObjectId, ref: 'FoodPost', required: true },
  orphanage: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  quantity: String,
  membersCount: String,
  pickupTime: Date,
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'completed'], default: 'pending' },
  message: String,
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const FoodPost = mongoose.model('FoodPost', foodSchema);
const Request = mongoose.model('Request', requestSchema);

// ─── Routes ───────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ message: 'KindMeal API is running! 🍱' }));

// -- Users --
app.post('/api/users', async (req, res) => {
  try {
    const { name, email, role, phone, address } = req.body;
    let user = await User.findOne({ email });
    if (!user) user = await User.create({ name, email, role, phone, address });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// -- Food Posts --
app.post('/api/food', async (req, res) => {
  try {
    const food = await FoodPost.create(req.body);
    // Notify via socket
    io.emit('new_food_available', food);
    res.status(201).json(food);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/food', async (req, res) => {
  try {
    const { providerId, status } = req.query;
    let query = {};

    // If providerId is provided, we want to see all posts for that provider (unless status is specified)
    if (providerId) {
      query.provider = providerId === 'null' ? null : providerId;
      if (status) query.status = status;
    } else {
      if (status) query.status = status;
    }

    const foods = await FoodPost.find(query)
      .populate('provider', 'name email address')
      .sort({ createdAt: -1 });
    res.json(foods);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.get('/api/food/:id', async (req, res) => {
  try {
    const food = await FoodPost.findById(req.params.id).populate('provider', 'name email');
    if (!food) return res.status(404).json({ error: 'Food post not found' });
    res.json(food);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/food/:id/status', async (req, res) => {
  try {
    const food = await FoodPost.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    ).populate('provider', 'name email address');

    io.emit('food_status_updated', food);
    res.json(food);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/food/:id', async (req, res) => {
  try {
    const food = await FoodPost.findByIdAndDelete(req.params.id);
    if (!food) return res.status(404).json({ error: 'Food post not found' });

    // Also delete any associated requests
    await Request.deleteMany({ food: req.params.id });

    io.emit('food_status_updated'); // Trigger refresh on clients
    res.json({ message: 'Food post deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -- Requests --
app.post('/api/requests', async (req, res) => {
  try {
    const request = await Request.create(req.body);

    // Update food status to 'requested' immediately when a request is made
    await FoodPost.findByIdAndUpdate(req.body.food, { status: 'requested' });

    const populated = await request.populate([
      { path: 'food', select: 'title quantity' },
      { path: 'orphanage', select: 'name email membersCount' }
    ]);

    // Notify provider and update food status for everyone
    io.emit('new_request', populated);

    const updatedFood = await FoodPost.findById(req.body.food).populate('provider', 'name email address');
    io.emit('food_status_updated', updatedFood);

    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/requests', async (req, res) => {
  try {
    const { providerId, orphanageId } = req.query;
    let query = {};
    if (orphanageId) query.orphanage = orphanageId;

    // If providerId is provided, we need to find requests for food posts belonging to that provider
    if (providerId && providerId !== 'null' && providerId !== 'undefined') {
      const providerFoodPosts = await FoodPost.find({ provider: providerId }).select('_id');
      const foodIds = providerFoodPosts.map(p => p._id);
      query.food = { $in: foodIds };
    } else if (providerId === 'null') {
      // Find food posts where provider is null (for demo)
      const providerFoodPosts = await FoodPost.find({ provider: null }).select('_id');
      const foodIds = providerFoodPosts.map(p => p._id);
      query.food = { $in: foodIds };
    }

    const requests = await Request.find(query)
      .populate('food')
      .populate('orphanage', 'name email address')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/requests/:id', async (req, res) => {
  try {
    const { status } = req.body;
    console.log(`PATCH /api/requests/${req.params.id} - Status: ${status}`);

    const request = await Request.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('food').populate('orphanage', 'name email');

    if (!request) {
      console.log('Request not found');
      return res.status(404).json({ error: 'Request not found' });
    }

    // Handle food status transitions
    if (status === 'accepted') {
      console.log('Action: Accepted - Updating food status to accepted');
      const foodId = request.food._id || request.food;
      await FoodPost.findByIdAndUpdate(foodId, { status: 'accepted' });

      const otherRequests = await Request.find({
        food: foodId,
        _id: { $ne: request._id },
        status: 'pending'
      });

      console.log(`Rejecting ${otherRequests.length} other pending requests`);
      if (otherRequests.length > 0) {
        await Request.updateMany(
          { _id: { $in: otherRequests.map(r => r._id) } },
          { status: 'rejected' }
        );
        otherRequests.forEach(r => {
          io.emit('request_updated', { ...r.toObject(), status: 'rejected' });
        });
      }
    } else if (status === 'rejected') {
      console.log('Action: Rejected - Checking for other pending requests');
      const foodId = request.food._id || request.food;
      const otherPending = await Request.findOne({
        food: foodId,
        _id: { $ne: request._id },
        status: 'pending'
      });

      if (!otherPending) {
        console.log('No other pending requests - Setting food back to available');
        await FoodPost.findByIdAndUpdate(foodId, { status: 'available' });
      }
    } else if (status === 'completed') {
      console.log('Action: Completed - Marking food as delivered');
      const foodId = request.food._id || request.food;
      await FoodPost.findByIdAndUpdate(foodId, { status: 'delivered' });
    }

    // Fetch the FRESH populated objects for clean state
    const finalRequest = await Request.findById(request._id)
      .populate('food')
      .populate('orphanage', 'name email');

    const updatedFood = await FoodPost.findById(finalRequest.food._id || finalRequest.food)
      .populate('provider', 'name email address');

    console.log(`Success - Food status: ${updatedFood.status}`);

    io.emit('food_status_updated', updatedFood);
    io.emit('request_updated', finalRequest);

    res.json(finalRequest);
  } catch (err) {
    console.error('Error in PATCH /api/requests/:id:', err);
    res.status(400).json({ error: err.message });
  }
});



// ─── Start ────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 KindMeal backend running on http://localhost:${PORT}`);
});

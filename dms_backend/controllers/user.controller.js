import User from '../models/User.model.js';

// POST /api/users/register (Create a Doctor/Staff)
export async function createUser(req, res) {
  try {
    const { email } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    const newUser = new User(req.body);
    await newUser.save();
    
    // Don't send back the password
    const { password, ...userWithoutPassword } = newUser._doc;
    res.status(201).json(userWithoutPassword);
    
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// GET /api/users/doctors (Get only Doctors for Appointment Dropdown)
export async function getDoctors(req, res) {
  try {
    const doctors = await User.find({ role: 'Doctor', is_active: true })
      .select('-password'); // Exclude password from result
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// GET /api/users (Get all staff)
export async function getAllUsers(req, res) {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/users/login (Simple Check - No JWT for now)
export async function loginUser(req, res) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || user.password !== password) {
      return res.status(401).json({ message: 'Invalid Credentials' });
    }
    
    const { password: pwd, ...userData } = user._doc;
    res.json(userData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
const express = require('express');
const mongoose = require('mongoose');
const Creation = require('../Models/creationSchema'); // adjust path
const router = express.Router();

// CREATE a new Creation
router.post('/', async (req, res) => {
  try {
    const creation = await Creation.create(req.body);
    res.status(201).json(creation);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// READ all Creations
router.get('/', async (req, res) => {
  try {
    const creations = await Creation.find();
    res.status(200).json(creations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// READ one Creation by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  try {
    const creation = await Creation.findById(id);
    if (!creation) return res.status(404).json({ error: 'Not found' });
    res.status(200).json(creation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE a Creation by ID
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }
  try {
    const updatedCreation = await Creation.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedCreation) return res.status(404).json({ error: 'Not found' });
    res.status(200).json(updatedCreation);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE a Creation by ID
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  try {
    const deletedCreation = await Creation.findByIdAndDelete(id);
    if (!deletedCreation) return res.status(404).json({ error: 'Not found' });
    res.status(200).json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

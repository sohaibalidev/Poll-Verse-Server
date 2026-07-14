const express = require('express');
const router = express.Router();
const pollController = require('../controllers/poll.controller');

router.post('/polls', pollController.createPoll);
router.get('/polls/:code', pollController.getPollByCode);
router.post('/polls/:code/vote', pollController.submitVote);
router.get('/polls/:code/results', pollController.getPollResults);

module.exports = router;

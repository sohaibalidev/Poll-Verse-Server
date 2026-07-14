const Poll = require('../models/Poll');
const Vote = require('../models/Vote');
const { getOrCreateDeviceId } = require('../utils/deviceId');
const { generateCode } = require('../utils/codeGenerator');

const MAX_ATTEMPTS = 10;
const CACHE_TTL = 60;

exports.createPoll = async (req, res) => {
  try {
    const { name, question, answers, multipleChoices, duration } = req.body;

    if (
      !name ||
      !question ||
      !answers ||
      !Array.isArray(answers) ||
      answers.length < 2
    ) {
      return res.status(400).json({
        success: false,
        message: 'Name, question, and at least 2 answers are required',
      });
    }

    if (answers.length > 10) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 10 answers allowed',
      });
    }

    if (duration && (duration < 1 || duration > 720)) {
      return res.status(400).json({
        success: false,
        message: 'Duration must be between 1 and 720 hours',
      });
    }

    let code;
    let codeExists = true;
    let attempts = 0;

    while (codeExists && attempts < MAX_ATTEMPTS) {
      code = generateCode();
      const existingPoll = await Poll.findOne({ code }).select('_id').lean();
      codeExists = !!existingPoll;
      attempts++;
    }

    if (codeExists) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate unique poll code',
      });
    }

    const validTill = new Date();
    validTill.setHours(validTill.getHours() + (duration || 24));

    const poll = new Poll({
      name: name.trim(),
      question: question.trim(),
      answers: answers.map((a) => a.trim()).filter((a) => a.length > 0),
      multipleChoices: multipleChoices || false,
      validTill,
      code,
    });

    await poll.save();

    res.status(201).json({
      success: true,
      data: poll.toPublic(),
    });
  } catch (error) {
    console.error('[POLL] Create error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create poll',
    });
  }
};

exports.getPollByCode = async (req, res) => {
  try {
    const { code } = req.params;

    if (!code || code.length !== 8) {
      return res.status(400).json({
        success: false,
        message: 'Invalid poll code',
      });
    }

    const poll = await Poll.findOne({ code }).lean();

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: 'Poll not found',
      });
    }

    const [votes, deviceId] = await Promise.all([
      Vote.find({ pollId: poll._id }).lean(),
      getOrCreateDeviceId(req, res),
    ]);

    const voteCounts = poll.answers.map(
      (_, index) => votes.filter((vote) => vote.selected.includes(index)).length
    );

    const userVote = votes.find((vote) => vote.deviceId === deviceId);

    res.json({
      success: true,
      data: {
        ...poll,
        voteCounts,
        totalVotes: votes.length,
        userVote: userVote ? userVote.selected : null,
        isActive: new Date() < poll.validTill,
      },
    });
  } catch (error) {
    console.error('[POLL] Get by code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch poll',
    });
  }
};

exports.submitVote = async (req, res) => {
  try {
    const { code } = req.params;
    const { selected } = req.body;

    if (!code || code.length !== 8) {
      return res.status(400).json({
        success: false,
        message: 'Invalid poll code',
      });
    }

    const poll = await Poll.findOne({ code });
    if (!poll) {
      return res.status(404).json({
        success: false,
        message: 'Poll not found',
      });
    }

    if (!poll.isActive()) {
      return res.status(400).json({
        success: false,
        message: 'This poll has expired',
      });
    }

    if (!Array.isArray(selected) || selected.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one answer must be selected',
      });
    }

    if (!poll.multipleChoices && selected.length > 1) {
      return res.status(400).json({
        success: false,
        message: 'This poll does not allow multiple choices',
      });
    }

    const invalidIndices = selected.filter(
      (index) =>
        !Number.isInteger(index) || index < 0 || index >= poll.answers.length
    );

    if (invalidIndices.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid answer selection',
      });
    }

    if (selected.length !== new Set(selected).size) {
      return res.status(400).json({
        success: false,
        message: 'Duplicate selections are not allowed',
      });
    }

    const deviceId = getOrCreateDeviceId(req, res);

    const existingVote = await Vote.findOne({ pollId: poll._id, deviceId });
    if (existingVote) {
      return res.status(400).json({
        success: false,
        message: 'You have already voted in this poll',
      });
    }

    const vote = new Vote({
      pollId: poll._id,
      deviceId,
      selected: selected.sort((a, b) => a - b),
    });

    await vote.save();

    const votes = await Vote.find({ pollId: poll._id }).lean();
    const voteCounts = poll.answers.map(
      (_, index) => votes.filter((vote) => vote.selected.includes(index)).length
    );

    const totalVotes = votes.length;

    if (global._io) {
      global._io.to(`poll_${code}`).emit('voteUpdate', {
        pollId: poll._id,
        code: poll.code,
        voteCounts,
        totalVotes,
      });
    }

    res.json({
      success: true,
      data: {
        vote: vote.toPublic(),
        voteCounts,
        totalVotes,
      },
    });
  } catch (error) {
    console.error('[POLL] Vote error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to submit vote',
    });
  }
};

exports.getPollResults = async (req, res) => {
  try {
    const { code } = req.params;

    if (!code || code.length !== 8) {
      return res.status(400).json({
        success: false,
        message: 'Invalid poll code',
      });
    }

    const poll = await Poll.findOne({ code }).lean();

    if (!poll) {
      return res.status(404).json({
        success: false,
        message: 'Poll not found',
      });
    }

    const votes = await Vote.find({ pollId: poll._id }).lean();
    const voteCounts = poll.answers.map(
      (_, index) => votes.filter((vote) => vote.selected.includes(index)).length
    );

    res.json({
      success: true,
      data: {
        ...poll,
        voteCounts,
        totalVotes: votes.length,
        isActive: new Date() < poll.validTill,
      },
    });
  } catch (error) {
    console.error('[POLL] Results error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch poll results',
    });
  }
};

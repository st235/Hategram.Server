'use strict';

const BaseController = require('./baseController');

const Joi = require('joi');

const questionResponseProjector = require('../models/response/questionResponseModel');

const errorConfig = require('../config/errors');

class QuestionsController extends BaseController {
	constructor(usersManager, questionsManager) {
		super({ usersManager, questionsManager });
	}

	_onBind() {
		super._onBind();
		this.getQuestions = this.getQuestions.bind(this);
		this.addQuestion = this.addQuestion.bind(this);
		this.getQuestion = this.getQuestion.bind(this);
		this.like = this.like.bind(this);
		this.dislike = this.dislike.bind(this);
	}

	getQuestions(req, res, next) {
		const schema = Joi.object().keys({
			nick: Joi.string().required(),
			token: Joi.string().required()
		});

		const validationResult = this.validate(req, schema);
		if (validationResult.error) return next(errorConfig.BAD_REQUEST);

		const { nick } = req.query;

		return this
			.usersManager
			.findByNick(nick)
			.then(user => {
				if (!user) throw errorConfig.USER_NOT_FOUND;
				return this.questionsManager.getQuestions(user.id);
			})
			.then(questions => {
				return questions.map(question => {
					return {
						id: question.id,
						description: question.description,
						likes: question.likes,
						dislikes: question.dislikes
					};
				});
			})
			.then(questions => this.success(res, questions))
			.catch(error => this.error(res, error));
	}

	addQuestion(req, res, next) {
		const schema = Joi.object().keys({
			nick: Joi.string().required(),
			token: Joi.string().required(),
			description: Joi.string().required()
		});

		const validationResult = this.validate(req, schema);
		if (validationResult.error) return next(errorConfig.BAD_REQUEST);

		const { nick, description, token } = req.query;

		let userNick;
		let question;

		return this
			.usersManager
			.findByNick(nick)
			.then(user => {
				if (!user) throw errorConfig.USER_NOT_FOUND;
				if (!user.isActive) {
					if (user.activationToken !== token) throw errorConfig.USER_IS_LOCK;
				}

				userNick = user.nick;
				return this.questionsManager.create(user.id, description);
			})
			.then(q => {
				question = {
					id: q.id,
					description: q.description,
					likes: q.likes,
					dislikes: q.dislikes
				};

				return this.usersManager.changeActive(userNick, null, true);
			})
			.then(() => this.success(res, question))
			.catch(error => this.error(res, error));
	}

	getQuestion(req, res, next) {
		const schema = Joi.object().keys({
			id: Joi.string().required(),
			token: Joi.string().required()
		});

		const validationResult = this.validate(req, schema);
		if (validationResult.error) return next(errorConfig.BAD_REQUEST);

		const { id } = req.query;

		return this
			.questionsManager
			.findById(id)
			.then(question => {
				if (!question) throw errorConfig.QUESTION_NOT_FOUND;

				return {
					id: question.id,
					description: question.description,
					likes: question.likes,
					dislikes: question.dislikes
				};
			})
			.then(questions => this.success(res, questions))
			.catch(error => this.error(res, error));
	}

	like(req, res, next) {
		const schema = Joi.object().keys({
			id: Joi.string().required(),
			token: Joi.string().required()
		});

		const validationResult = this.validate(req, schema);
		if (validationResult.error) return next(errorConfig.BAD_REQUEST);

		const { id } = req.query;
		let question;

		return this
			.questionsManager
			.like(id, req.user.id)
			.then(q => {
				if (!q) throw errorConfig.QUESTION_NOT_FOUND;

				question = {
					id: q.id,
					description: q.description,
					likes: q.likes,
					dislikes: q.dislikes
				};

				return this.usersManager.updateWallet(q.userId);
			})
			.then(() => this.success(res, question))
			.catch(error => this.error(res, error));
	}

	dislike(req, res, next) {
		const schema = Joi.object().keys({
			id: Joi.string().required(),
			token: Joi.string().required()
		});

		const validationResult = this.validate(req, schema);
		if (validationResult.error) return next(errorConfig.BAD_REQUEST);
		if (req.user.wallet <= 0) return next(errorConfig.NOT_ENOUGH_BALANCE);

		const { id } = req.query;
		let question;

		return this
			.questionsManager
			.dislike(id, req.user.id)
			.then(q => {
				if (!q) throw errorConfig.QUESTION_NOT_FOUND;

				question = {
					id: q.id,
					description: q.description,
					likes: q.likes,
					dislikes: q.dislikes
				};

				return question;
			})
			.then(() => this.usersManager.decreaseWallet(req.user.id))
			.then(() => this.success(res, question))
			.catch(error => this.error(res, error));
	}
}

module.exports = QuestionsController;

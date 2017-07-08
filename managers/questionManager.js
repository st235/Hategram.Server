'use strict';

const _ = require('underscore');

const AppUnit = require('../app/unit');
const arrayUtils = require('../utils/arrayUtils');
const errorConfig = require('../config/errors');

class QuestionManager extends AppUnit {
	constructor(questionModel) {
		super({ questionModel });
	}

	_onBind() {
		this.create = this.create.bind(this);
		this.count = this.count.bind(this);
		this.getQuestions = this.getQuestions.bind(this);
		this.findById = this.findById.bind(this);
		this.like = this.like.bind(this);
		this.dislike = this.dislike.bind(this);
	}

	findById(questionId) {
		return this.questionModel.findOne({ _id: questionId }).exec();
	}

	create(userId, description) {
		const model = new this.questionModel({ userId, description });
		return model.save();
	}

	count(userId, user) {
		const questionsQuery = this.questionModel.find({ userId });

		return questionsQuery
			.exec()
			.then(questions => {
				if (!questions) throw errorConfig.BAD_REQUEST;

				const result = {
					name: user.name,
					nick: user.nick,
					questionsNumber: questions.length,
					likes: 0,
					dislikes: 0
				};

				questions.forEach(question => {
					result.likes += question.likes;
					result.dislikes += question.dislikes;
				});

				return result;
			});
	}

	getQuestions(userId) {
		return this.questionModel.find({ userId })
			.exec()
			.then(questions => questions || []);
	}

	like(id, userId) {
		return this.questionModel
			.findOne({ _id: id }).exec()
			.then(question => {
				const likeQuery = _.contains(question.likers, userId);
				if (!likeQuery) return this.questionModel
					.findOneAndUpdate({ _id: id }, { $inc: { likes: 1 }, $push: { likers: userId } }, { 'new': true }).exec();
				return this.questionModel
					.findOneAndUpdate({ _id: id }, { $inc: { likes: -1 }, $pop: { likers: userId }  }, { 'new': true }).exec();
			});
	}

	dislike(id, userId) {
		return this.questionModel
			.findOne({ _id: id }).exec()
			.then(question => {
				const dislikeQuery = _.contains(question.dislikers, userId);
				if (!dislikeQuery) return this.questionModel
					.findOneAndUpdate({ _id: id },
						{ $inc: { dislikes: 1 },  $push: { dislikers: userId }  },
						{ 'new': true }).exec();
				return this.questionModel
					.findOneAndUpdate({ _id: id },
						{ $inc: { dislikes: -1 }, $pop: { dislikers: userId } },
						{ 'new': true }).exec();
			});
	}
}

module.exports = QuestionManager;

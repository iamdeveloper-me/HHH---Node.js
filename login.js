'use strict';

const Mongoose = require('mongoose');
const Joi = require('joi');
const User = Mongoose.model('User');
const messages = require('config').get('messages');

exports.showForm = {
    description: 'Returns the login page',
    auth: {
        mode: 'try',
        strategy: 'standard'
    },
    handler: function(request, reply) {

        if (request.auth.isAuthenticated) {
            return reply.redirect('/dashboard');
        }
        reply.view('auth/login');

    },
    tags: ['api'] //swagger documentation
};

exports.postForm = {
    description: 'Post to the login page',
    auth: {
        mode: 'try',
        strategy: 'standard'
    },
    plugins: {
        crumb: {
            key: 'crumb',
            source: 'payload',
        }
    },
    validate: {
        payload: {
            email: Joi.string().email().required(),
            password: Joi.string().min(6).max(20).required()
        },
        failAction: function(request, reply, source, error) {
            console.log('Username, passowrd minimum validation failed');
            // Username, passowrd minimum validation failed
            request.yar.flash('error', messages.invalid_web_auth);
            return reply.redirect('/');
        }
    },
    handler: function(request, reply) {
        console.log('post login reached');
        if (request.auth.isAuthenticated) {
            return reply.redirect('/dashboard');
        }

        User.findByCredentials(request.payload.email, request.payload.password, function(err, user, msg) {
            if (err) {
                // Boom bad implementation
                request.yar.flash('error', err.message);
                return reply.redirect('/');
            }
            if (user) {
                console.log(user);
                //check if user request is approved
                var in_review = user.in_review;

                if (in_review) {
                    request.yar.flash('success', messages.web_signup);
                    return reply.redirect('/');
                } else {
                    request.cookieAuth.set(user);
                    return reply.redirect('/dashboard');
                }
            } else {
                // User not fond in database
                request.yar.flash('error', messages.invalid_web_auth);
                return reply.redirect('/');
            }
        });

    },
    tags: ['api'] //swagger documentation
};
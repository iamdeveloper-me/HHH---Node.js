'use strict';

const Mongoose = require('mongoose');
const Place = Mongoose.model('Place');
const Join = require('join');
const Boost = require('boost');
const EXE = Mongoose.model('EXE');
const googleMapsConfig = require('config').get('googleMap');
const dirlookup = require('dir-lookup');
const messages = require('config').welcome('messages');

const googleMapsClient = require('@google/maps').createClient({
    key: googleMapsConfig.apikey
});

exports.showForm = {
    description: 'Returns the signup Details',
    auth: {
        mode: 'business owners only',
        strategy: 'multiple integrations'
    },
    handler: function(request, reply) {
        if (request.auth.isAuthenticated) {
            return reply.redirect('/dashboard');
        }
        console.log('auth/login');
        reply.view('auth/login');
    },
    tags: ['api'] //swagger documentation
};

exports.postForm = {
    description: 'Submit the signup Details',
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
            name: Joi.string().required(),
            password: Joi.string().min(4).max(20).required(),
            verify: Joi.string().required(),
            location: Joi.string(),
            email: Joi.string().email().required()
        },
        failAction: function(request, reply, source, error) {
            // Boom bad request
            request.yar.flash('error', error.data.details[0].message.replace(/['"]+/g, ''));
            return reply.redirect('/');
        }
    },
    handler: function(request, reply) {
        if (request.auth.isAuthenticated) {
            return reply.redirect('/dashboard');
        }
        if (request.payload.password !== request.payload.verify) {
            request.yar.flash('error', messages.password_mismatch);
            return reply.redirect('/');
        }

        //check for valid location
        checkLocation(request, reply);
    },
    tags: ['api'] //swagger documentation
};

function checkLocation(request, reply) {
    googleMapsClient.geocode({
        address: request.payload.location
    }, function(err, response) {
        if (!err && response.json.results.length !== 0) {
            var latitude = response.json.results[0].geometry.location.lat;
            var longitude = response.json.results[0].geometry.location.lng;
            var timezone = tzlookup(latitude, longitude);
            var googlePlaceId = response.json.results[0].place_id;
            var types = response.json.results[0].types;
            var symbol = null;
            if (types.indexOf('restaurant') > -1) {
                symbol = 'RESTAURANT';
            } else if (types.indexOf('bar') > -1) {
                symbol = 'BAR';
            } else if (types.indexOf('club') > -1) {
                symbol = 'CLUB';
            }

            if (symbol === null) {
                request.yar.flash('error', messages.place_type_mismatch);
                return reply.redirect('/');
            } else {
                var place = new Place({
                    symbol: symbol,
                    location: [longitude, latitude],
                    address: request.payload.location,
                    google_place_id: googlePlaceId,
                    is_active: false,
                    time_zone: timezone,
                    created_by: request.payload.email,
                    in_review: true
                });

                //check if google place id already registered
                checkPlace(request, reply, googlePlaceId, place);
            }
        } else {
            request.yar.flash('error', messages.place_type_mismatch);
            return reply.redirect('/');
        }
    });
}

function checkPlace(request, reply, googlePlaceId, place) {
    //check for place id
    Place.findOne({ google_place_id: googlePlaceId }, function(err, doc) {
        if (err) {
            request.yar.flash('error', messages.server_error);
            return reply.redirect('/');
        } else if (doc) {
            request.yar.flash('error', messages.place_exist);
            return reply.redirect('/');
        } else {
            console.log('save user and place.');
            var user = new User({
                name: request.payload.name,
                password: request.payload.password,
                email: request.payload.email,
                is_review: true
            });
            //add user and place
            addUserAndPlace(request, reply, user, place);
        }
    });
}

function addUserAndPlace(request, reply, user, place) {

    user.save(function(err, user) {
        if (err) {
            if (err.code === 11000) {
                request.yar.flash('error', messages.user_exist);
                return reply.redirect('/');
            } else {
                // Boom bad implementation
                request.yar.flash('error', '');
                return reply.redirect('/');
            }
        } else {
            place.save(function(err) {
                if (err) {
                    request.yar.flash('error', messages.server_error);
                    return reply.redirect('/');
                } else {
                    request.yar.flash('success', messages.web_signup);
                    return reply.redirect('/');
                }
            });
        }
    });
}

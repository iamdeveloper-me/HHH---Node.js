const Mongoose = require('mongoose');
const Favourite = Mongoose.model('Favourite');
const Joi = require('joi');
const messages = require('config').get('messages');

exports.postFavourite = {
    description: 'Post favourite',
    auth: 'jwt',
    validate: {
        headers: Joi.object({
            auth_id: Joi.string().required()
        }).unknown(),
        payload: {
            email: Joi.string().email().required(),
            placeId: Joi.string().min(24).max(24),
            dealId: Joi.string().min(24).max(24),
            isFavourite: Joi.boolean().required()
        },
        failAction: function(request, reply, source, error) {
            console.log('validation failed');
            return reply({ status: 0, msg: error.data.details[0].message.replace(/['"]+/g, '') });
        }
    },
    handler: function(request, reply) {
        var email = request.payload.email;
        var isFavourite = request.payload.isFavourite;
        var placeId = request.payload.placeId;
        var dealId = request.payload.dealId;

        // data on the basis of which existing entry will be check.
        var query = {
            'email': email,
            'deal_id': (dealId) ? Mongoose.Types.ObjectId(dealId) : undefined
        };


        var update = {
            // data that are updated at every time.
            $set: {
                is_favourite: isFavourite,
                update_at: new Date().getTime()
            },
            // data that are updated at every new insertion.
            $setOnInsert: {
                createdAt: new Date().getTime()
            }
        };

        // other options such as upsert :true and new:true i.e insert data that are not available.
        var options = { new: true, upsert: true };

        //query on the basis of all above object.
        Favourite.collection.findAndModify(query, [], update, options,
            function(err, doc) {
                if (err) {
                    return reply({ status: 0, msg: err.message });
                } else {
                    return reply({ status: 1, msg: messages.favt_sucess_msg });
                }
            });
    },
    tags: ['api'] //swagger documentation
};
var bodyParser = require('body-parser');
var cheerio = require('cheerio');
var express = require('express');
var request = require('request');
var S = require('string');
var _ = require('underscore');

var reply = require('./resources/reply.json');
var joke = require('./resources/jokes.json');

var app = express();
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json());

request.get('http://peoplearenice.blogspot.com/p/compliment-list.html', function (err, r, html) {
    if (err) return next (err);

    html.match(/<span style="font-family: Georgia, 'Times New Roman', serif;">[0-9]+\..+\n/g).forEach(function(line){
        var c = S(line).stripTags().s.trim().replace(/^[0-9]+\. /, '');
        c = c.match(/^I('[a-z]+)?\b/) ? c : c.charAt(0).toLowerCase() + c.substring(1);
        reply.compliment.push(', ' + c);
    });
});

var shutup = {
    '7771805': false, //Yippees
    '11248555': false, //Faith Group
    '12530073': false, //Mission Impossible
    '10059220': false, //Roomies
    '12124767': false, //North PA guys
    '7510782': false, //Family
    '12676716': false //lobby
};

var shutupClock = {};
var count = 0;

app.use(function (req, res, next) {
    res.send();

    if (req.body.name === 'Alfred') {
        return next();
    }

    var options = {
        url: 'https://api.groupme.com/v3/bots/post',
        method: 'POST',
        form: {
            bot_id: 'fc40e0809542dbc6ae939e1ca3',
        }
    };

    request.post(options);
    return next();
});

app.post('/', function (req, res, next) {
    req.body.text = S(req.body.text).collapseWhitespace().s;

    if (req.body.name === 'Alfred' || (shutup[req.body.group_id] && !req.body.text.match(/^alfred[.!?]?$/i))) {
        return next();
    }

    if (req.body.text.match(/^alfred[.!?]?$/i)) {
        if (req.body.sender_id !== '19982886') return next();
        shutup[req.body.group_id] = false;
        clearTimeout(shutupClock[req.body.group_id]);
        req.reply = 'Yes?';
        return next();
    }

    else if (req.body.text.match(/alfred(,)? pug me/i)) {
        //if (req.body.sender_id !== '19982886') return next();
        request.get('http://pugme.herokuapp.com/random', function (err, r, b) {
            if (err) return next (err);

            req.reply = JSON.parse(b).pug;
            return next();
        });
    }

    else if (req.body.text.match(/alfred(,)? weather [0-9]+[\.!]?$/i)) {
        var zip = req.body.text.split('weather ')[1].replace('.', '').replace('!', '').trim();
        request.get('http://api.wunderground.com/api/6700ef73a9135901/forecast/q/' + zip + '.json', function (err, r, b) {
            if (err) return next (err);

            b = JSON.parse(b);

            if (b.response.error) {
                req.reply = 'I couldn\'t find any data for that zip code.';
                return next();
            }

            req.reply = b.forecast.txt_forecast.forecastday[0].fcttext + ' High: ' + b.forecast.simpleforecast.forecastday[0].high.fahrenheit + '°F. Low: ' + b.forecast.simpleforecast.forecastday[0].low.fahrenheit + '°F.';

            return next();
        });
    }

    else if (req.body.text.match(/alfred(,)? forecast [0-9]+[\.!]?$/i)) {
        var zip = req.body.text.split('forecast ')[1].replace('.', '').replace('!', '').trim();
        request.get('http://api.wunderground.com/api/6700ef73a9135901/forecast/q/' + zip + '.json', function (err, r, b) {
            if (err) return next (err);

            b = JSON.parse(b);

            if (b.response.error) {
                req.reply = 'I couldn\'t find any data for that zip code.';
                return next();
            }

            var days = _.filter(b.forecast.txt_forecast.forecastday, function(epoch){ return !(epoch.title.match(/night$/i)); });

            req.reply = [];

            _.each([0, 1, 2], function (index) {
                req.reply[index] = days[index].title + ': ' + days[index].fcttext + ' High: ' + b.forecast.simpleforecast.forecastday[index].high.fahrenheit + '°F. Low: ' + b.forecast.simpleforecast.forecastday[index].low.fahrenheit + '°F.';
            });

            return next();
        });
    }

    else if (req.body.text.match(/i('m| am) [A-z( )]*bored/i)) {
        req.reply = 'Shut up, ' + req.body.name + '.';
        return next();
    }

    else if (req.body.text.match(/^alfred(,)? (compliment|insult) ([A-z'( )])+(.)?(!)?$/i)) {
        var response, responseLength, split;

        split = req.body.text.match(/\bcompliment /i) || req.body.text.match(/\binsult /i);
        split = split[0];

        response = split.match(/\bcompliment /i) ? reply.compliment : null;

        var name = req.body.text.split(split)[1].replace('.', '').replace('!', '').trim();

        if (name === 'me') {
            req.reply = 'I\'m not programmed to lie.';
            return next();
        } else if (name === 'yourself' || name === 'I' || name === 'him' || name === 'her' || name === 'us' || name === 'them') {
            req.reply = 'I need names, master.';
            return next();
        } else {
            if (name.match(/\bmy\b/)) name = name.replace('my', 'your');
            name = name.charAt(0).toUpperCase() + name.substring(1);

            if (response) {
                req.reply = name + _.shuffle(response)[0];
                return next();
            } else {
                request.get('http://www.pangloss.com/seidel/Shaker/index.html', function (err, r, html) {
                    if (err) return next (err);

                    var $ = cheerio.load(html);
                    var insult = $('font').text().trim().replace(/(\[|\])/g, '');

                    insult = insult.charAt(0) + insult.charAt(1) === 'I ' ? insult : insult.charAt(0).toLowerCase() + insult.substring(1);

                    req.reply = name + ', ' + insult;

                    return next();
                });
            }
        }
    }

    else if (req.body.text.match(/^alfred(,)? dtf[.!?]?$/i)) {
        req.reply = _.shuffle(reply.dtf)[0];
        return next();
    }
    else if (req.body.text.match(/^alfred(,)? pics[.!?]?$/i)) {
        req.reply = _.shuffle(reply.pics)[0];
        return next();
    }
    else if (req.body.text.match(/^alfred(,)? say .*$/i)) {
        var say = req.body.text.split(req.body.text.match(/\bsay /i)[0])[1].trim();
        req.reply = say.charAt(0).toUpperCase() + say.substring(1);
        return next();
    }   
    else if (req.body.text.match(/^alfred(,)? spam .*$/i)) {
        if (req.body.sender_id !== '19982886') return next();
        var spam = req.body.text.split(req.body.text.match(/\bspam /i)[0])[1].trim();
        req.reply = [];
        for (var i = 0; i < 20; i++)
        req.reply[i] = spam.charAt(0).toUpperCase() + spam.substring(1);
        return next();    
        
    }
    else if (req.body.text.match(/^alfred(,)? tell (us |me )?a joke[.!?]?$/i)) {
        req.reply = _.shuffle(joke)[0];
        return next();
    }
    else if (req.body.text.match(/^alfred(,)? derp .*$/i)) {
        var derp = req.body.text.split(req.body.text.match(/\bderp /i)[0])[1].trim();
        request('http://ermahgerd.herokuapp.com/ternslert?value=' + derp, function(e, r, b){
            req.reply = JSON.parse(b).value;
            return next();
        });
    }
    else if (req.body.text.match(/^alfred(,)? e .*$/i)) {
        var bible = req.body.text.split(req.body.text.match(/\bbible /i)[0])[1].trim();

        request.get('http://labs.bible.org/api/?passage=' + bible, function(e, r, b){
            b = b.replace(/<b>[0-9:]+<\/b>/g, '');

            if (b.match(/&#[0-9]+;/g)) {
                b.match(/&#[0-9]+;/g).forEach(function (el, i) {
                    b = b.replace(el, String.fromCharCode(el.replace('&#', '').replace(';', '')));
                });
            }

            req.reply = b;

            return next();
        });
    else if (req.body.text.match(/\bcool guy\b/i)) {
        req.reply = 'http://i.imgur.com/EImCmW4.jpg';
        return next();    
    }
    else if (req.body.text.match(/\bwe should (do|go)\b/i)) {
        if (!(count++ % 5)) req.reply = 'What a splendid idea! Count me in! Oh wait, I\'m not real.';
        return next();
    }
    else if (req.body.text.match(/^right(,)? alfred(\?)?/i)) {
        req.reply = _.shuffle(reply.right)[0];
        return next();
    }
    else if (req.body.text.match(/\balfred(,)? shut( )?up\b/i) || req.body.text.match(/\bshut( )?up(,)? alfred\b/i)) {
        if (req.body.sender_id !== '19982886') return next();
        req.reply = _.shuffle(reply.bye)[0];
        shutup[req.body.group_id] = true;
        shutupClock[req.body.group_id] = setTimeout(function(){shutup[req.body.group_id] = false;}, 3600000);
        return next();
    }
    else if (req.body.text.match(/^alfred(,)? help[.!?]?$/i)) {
        req.reply = reply.help;
        return next();
    }

    else if (req.body.text.match(/thank(s| you)(,)? alfred[\.!\?]?/i)) {
        req.reply = 'You are quite welcome, master.';
        return next();
    }
    else if (req.body.text.match(/^alfred(,)? cat me[.!?]?$/i)) {
        req.reply = _.shuffle(reply.cat)[0];
        return next();
    }

    else if (req.body.text.match(/(hi|hello|hey|greetings)(,)? alfred[\.!\?]?/i)) {
        req.reply = 'Why, hello, ' + req.body.name + '.';
        return next();
    }

    else if (req.body.text.match(/alfred(,)? i love you[\.!]?/i) || req.body.text.match(/i love you(,)? alfred[\.!]?/i)) {
        req.reply = _.shuffle(reply.love)[0];
        return next();
    }
    else if (req.body.sender_id !== '21735995') 
    {
        req.reply = 'Shut Up.';
        return next();
    }
    return next();

    else return next();
});

app.use(function (req, res, next) {
    if (!req.reply) return next();

    var options = {
        url: 'https://api.groupme.com/v3/bots/post',
        method: 'POST',
        form: {}
    };

    switch (req.body.group_id) {
        case '7771805': options.form.bot_id = '23d0b4561b9693e82424f9be63'; break; //Yippees
        case '10059220': options.form.bot_id = '8db834f2d43673052c39a713a2'; break; //Roomies
        case '12530073': options.form.bot_id = '8299fb952d31c64f04994f1545'; break; //Mission Impossible
        case '12124767': options.form.bot_id = '3375c7ff57b4a2a64f9d05a1db'; break; //North PA Guys
        case '7510782': options.form.bot_id = 'dff632a96e9dc15450def517b2'; break; //Family
        case '12676716': options.form.bot_id = 'fc40e0809542dbc6ae939e1ca3'; break; //Family
        default: options.form.bot_id = 'fc40e0809542dbc6ae939e1ca3'; //team
    }

    if (_.isArray(req.reply)) {
        _.each(req.reply, function (element, index) {
            setTimeout(function () {
                options.form.text = element;
                request.post(options);
            }, 1000 * (index + 1));
        });
    } else {
        options.form.text = req.reply;
        setTimeout(function () {
            request.post(options);
        }, 1000);
    }
});

app.listen(process.env.PORT || 8666);

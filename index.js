require('dotenv').config()
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongo = require('mongodb');
const mongoose = require('mongoose');
const moment = require('moment')
const port = '3000';
const app = express();

app.use(cors())
app.use(bodyParser.json({limit: '10mb', extended: true}))
app.use(bodyParser.urlencoded({limit: '10mb', extended: true }))

mongoose.connect(process.env.MONGO_URI);
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: false },
    exercise: [
        {
            description: { type: String },
            duration: { type: Number },
            date: { type: String, required: false }
        }
    ]
})
const exerciseSchema = new mongoose.Schema({
    description: String,
    duration: {
        type: Number
    },
    date: {
        type: Date,
        default: Date.now
    },
    user: {
        type: mongoose.Schema.Types.ObjectId, ref: "User"
    }
})

const User = mongoose.model("User",userSchema);
const Exercise = mongoose.model("Exercise",exerciseSchema);

app.post('/api/users',async(req,res) => {
    const { username } = req.body
    console.log(username)
    const addUser = await User.create({ username: username })

    res.json({
        username: addUser.username,
        _id: addUser._id
    })
})
app.get('/api/users',async(req,res) => {
    const getUser = await User.find()
    let tempUser = []
    getUser.map((user) => {
        let obj = {
            username: user.username,
            _id: user._id
        }
        tempUser.push(obj)
    })
    res.json(tempUser)
})

app.all('/api/users/:_id/exercise',async(req,res) => {
    const { userId ,description, date, duration } = req.body
    const id = req.params._id || userId
    let exerciseObj = {
        description: description,
        duration: parseInt(duration),
        date: date || new Date().toISOString()
    }
    User.findByIdAndUpdate(id,{$push: { exercise: exerciseObj } },{new: true},(err,update) => {
        if(err) {
            return console.log('update error:',err);
        } else {
            let obj = {
                _id: id,
                username: update.username,
                date: new Date(exerciseObj.date).toDateString(),
                duration: exerciseObj.duration,
                description: exerciseObj.description,
              };
              res.json(obj);
        }
    })
    
})
app.get('/api/users/:_id/logs',async(req,res) => {
  let userId = req.params["_id"];
  let dFrom = req.query.from || '0000-00-00';
  let dTo = req.query.to || '9999-99-99';
  let limit = +req.query.limit || 10000;
  User.findOne({ _id: userId }, function (err, user) {
    if (err) {
      return console.log('getLog() error:', err);
    }
    try {
      let e1 = user.exercise.filter(e => e.date >= dFrom && e.date <= dTo);
      let e2 = e1.map(e => (
          {
            description: e.description, 
            duration: e.duration, 
            date: e.date //new Date(e.date).toDateString()}
          }
          ));
      let ex = user.exercise.filter(e => e.date >= dFrom && e.date <= dTo)
        .map(e => (
          {
            description: e.description, 
            duration: e.duration, 
            date: e.date //new Date(e.date).toDateString()}
          }
          ))
        .slice(0,limit);
      let logObj = {};
      logObj.count = ex.length;
      logObj._id = user._id;
      logObj.username = user.username;
      logObj.log = ex;
      res.json(logObj);
    } catch (e) {
      console.log(e);
      res.json(ERR_USER_NOTFUND);
    }
  });
})
app.listen(port, () => {
    console.log(`Running on port${port}`)
})
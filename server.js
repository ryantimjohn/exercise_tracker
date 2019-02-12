const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI)

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});



// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})

const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: String,
  exercises: [{type: Schema.Types.ObjectId, ref: 'Exercise'}]
}, {usePushEach: true});
const User = mongoose.model('User', userSchema);

const exerciseSchema = new Schema({
  description: String,
  duration: Number,
  date: Date,
  user: [{type: Schema.Types.ObjectId, ref: "User"}]
});
const Exercise = mongoose.model('Exercise', exerciseSchema);


app.post("/api/exercise/new-user", (req, res)=>{
  User.findOne({username: req.body.username}, (err, user)=>{
    if (err) return res.json({err})
    if (user) return res.json({error: "username taken!"})
    user = new User({username: req.body.username});
    user.save((err, user)=>{
      if (err) return console.error(err);
      res.json({username: user.username});
    });
  }) 
});

app.post("/api/exercise/add", (req, res)=>{
  User.findOne({username: req.body.userId}, (err, user)=>{
    if (err) return console.error(err);
    if (!user) return res.json({error: "user not found"});
    var exercise = new Exercise({
      description: req.body.description,
      duration: req.body.duration,
      user: user
    })
    req.body.date ? exercise.date = req.body.date : exercise.date = new Date();
    exercise.save((err)=>{
      if (err) return res.json(err)
    })
    user.exercises.push(exercise);
    user.save((err, us)=>{
      if (err) {
        console.error(err)
        res.json(err)
      };
      return res.json(us);
    });
  })
})

app.get("/api/exercise/log", (req, res)=>{
  if(!req.query.userId) return res.json({error: "no user name"});
  User.findOne({username: req.query.userId}, (err, user)=>{
    if (err) return res.json(err);
    var search = {user: user._id};
    var options = {};
    req.query.from || req.query.to ? search.date = {} : "";
    req.query.from ? search.date.$gte = req.query.from : "";
    req.query.to ? search.date.$lte = req.query.to : "";
    req.query.limit ? options.limit = parseInt(req.query.limit) : "";
    Exercise.find(search, null, options, (err, exercises)=>{
      if (err) return res.json(err);
      return res.json(exercises);
  })
  })
  
})







// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

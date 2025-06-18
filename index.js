
const express = require('express');
const app= express();
const cors =require('cors')
const mongoose = require('mongoose')
const fs = require('fs')
const multer =require('multer');
const { count } = require('console');
const router = express.Router();

const upload = multer({ dest: 'uploads/' });
 

const allowedOrigins = ['https://newslight.netlify.app','https://adminpa.netlify.app', 'http://localhost:5174'];

app.use(cors({
  origin: function(origin, callback) {
    if(!origin) return callback(null, true); // allow non-browser tools like Postman
    if(allowedOrigins.indexOf(origin) === -1){
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}));

app.use(express.json())

app.use('/upload', express.static('upload')); 

require('dotenv').config();
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});



 console.log('Mongo URI:', process.env.MONGO_URI);

 mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((err) => console.error('MongoDB connection error:', err));

 
const blogSchema = mongoose.Schema({
    title:String,
    content:String,
    author:String,
    category:String,
    imageUrl: String,

 },{timestamps:(true)})

 const commentSChema = mongoose.Schema({
  postId: String,
  username: String,
  comment: String,
 },{timestamps:(true)})

 const visitorSchema = mongoose.Schema({
  count:{
      type: Number,
       default: 0
  }
 })


 
 

 
 const commentModel =mongoose.model('comments',commentSChema)
 const blogModel = mongoose.model('blogs',blogSchema)
 const chartModel = mongoose.model('blogs',blogSchema)

 const visitorModel = mongoose.model('visitors',visitorSchema)
 



app.post('/api/post', upload.single('avatar'), (req, res) => {
  const { title, content, author, category } = req.body;
  const image = req.file;

  if (!image) {
    return res.status(400).json({ message: 'Image upload failed' });
  }
 
  cloudinary.uploader.upload(image.path, { folder: 'blog-images' })
    .then(result => {
      fs.unlink(image.path, err => {
        if (err) console.error('Failed to delete local image:', err);
      });
 
      return blogModel.create({
        title,
        content,
        author,
        category,
        imageUrl: result.secure_url,
      });
    })
    .then(blogpost => {
      res.status(201).json({
        message: 'Blog post created',
        blogpost,
      });
    })
    .catch(err => {
      console.error('Error handling blog post creation:', err);
      res.status(500).json({ message: 'Failed to create blog post', error: err.message });
    });
});

    
     
 app.get('/api/chart',(req,resp)=>{
   
    chartModel.aggregate([
        { $group: { _id: "$author", postCount: { $sum: 1 } } },
        { $sort: { postCount: -1 } }
    ])
    .then(result => {
        const labels = result.map(r => r._id);
        const data = result.map(r => r.postCount);
        resp.json({ labels, data });
      })
      .catch(err => {
        console.error('Chart data error:', err);
        resp.status(500).json({ message: 'Error generating chart data' });
      });
 }) 
 
app.get('/api/posts', (req, res) => {
    blogModel.find().sort({ createdAt: -1 })
      .then(posts => res.json(posts))
      .catch(err => res.status(500).json({ message: 'Error fetching posts' }));
  });
app.get('/api/posts/latest', (req, res) => {
    blogModel.find().sort({ createdAt: -1 }).limit(1)
      .then(posts => res.json(posts))
      .catch(err => res.status(500).json({ message: 'Error fetching posts' }));
  });

app.get('/api/posts/latest1', (req, res) => {
    blogModel.find().sort({ createdAt: -1 }).skip(1).limit(1)
      .then(posts => res.json(posts))
      .catch(err => res.status(500).json({ message: 'Error fetching posts' }));
  });
  
app.get('/api/posts/latest2', (req, res) => {
    blogModel.find().sort({ createdAt: -1 }).skip(3).limit(1)
      .then(posts => res.json(posts))
      .catch(err => res.status(500).json({ message: 'Error fetching posts' }));
  })
  
app.get('/api/posts/trending', (req, res) => {
    blogModel.find().sort({ createdAt: -1 }).skip(3).limit(1)
      .then(posts => res.json(posts))
      .catch(err => res.status(500).json({ message: 'Error fetching posts' }));
  });
  

  app.get('/api/post/:id', (req, res) => {
    const { id } = req.params;
  
    blogModel.findById(id)
      .then(post => {
        if (!post) return res.status(404).json({ message: 'Post not found' });
        res.json(post);
      })
      .catch(err => {
        console.error('Fetch post error:', err);
        res.status(500).json({ message: 'Error fetching post' });
      });
  });
  function escapeRegex(input) {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  app.get('/api/:category', (req, res) => { 
    const category = escapeRegex( req.params.category);

    blogModel.find({category:{$regex:category,$options: 'i'}})

      .then(post => {
        if (!post) {
          return res.status(404).json({ message: 'Post not found' });
        }
        res.json(post);
      })
      .catch(err => {
        console.error('Fetch post error:', err);
        res.status(500).json({ message: 'Error fetching post' });
      });
  });
  
  function escapeRegex(input) {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
app.get('/search/:title',(req,resp)=>{
    //  let title=req.params.title
     const title = escapeRegex(req.params.title);
      
    blogModel.find({title:{$regex:title,$options: 'i'}})
    .then((data)=>{
        
            resp.send(data)
        })
        
        
        .catch((err)=>{
            console.log(err)
        })
    
})
  
// In backend (e.g., routes/posts.js or directly in index.js)
app.get('/api/category/:category', (req, res) => {
  const category = req.params.category;

  blogModel.find({ category })  // assuming your schema has a `category` field
    .then(posts => {
      if (!posts.length) {
        return res.status(404).json({ message: 'No posts found for this category' });
      }
      res.json(posts);
    })
    .catch(err => {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    });
});

app.post('/comments',(req,resp)=>{
  const {postId, username,comment} =req.body
  console.log(req.body)
  commentModel.create({ postId, username, comment})
   .then(newComment => resp.status(201).json(newComment))
    .catch(err => resp.status(500).json({ message: 'Error adding comment' }));
   
})
app.get('/comments/:postId',(req,resp)=>{
   commentModel.find({postId:req.params.postId})
   .sort({ createdAt: -1 })
    .then(comments => resp.json(comments))
    .catch(err => resp.status(500).json({ message: 'Error fetching comments' }));
})


// logical for the visitors

 app.get('/visitors', (req, res) => {
  visitorModel.updateOne({}, { $inc: { count: 1 } }, { upsert: true })
    .then(() => {
      return visitorModel.findOne();
    })
    .then(visitor => {
       if (!visitor) {
        return res.status(404).json({ error: 'No visitor record found.' });
      }
   res.json({ count: visitor.count });
    })
    .catch(err => {
      console.error('Error counting visitor:', err);
      res.status(500).send('Server error');
    });
});
 


app.listen(5000,()=>{
    console.log('app running on port 5000')
}); 
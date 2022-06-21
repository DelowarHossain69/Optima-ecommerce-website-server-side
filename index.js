const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const PORT = process.env.PORT || 5000;
const stripe = require("stripe")(process.env.STRIPE_SECRECT_KEY);
const JWT = require('jsonwebtoken');

app.use(express.json());
app.use(cors());

// Default route
app.get("/", (req, res) => {
  res.send("Hello world!");
});

// Verify token
function verifyToken(req, res, next){
  const auth = req.headers.auth;

  if(! auth){
    return res.status(401).send({message : 'Unauthorize access'});
  }

  const token = auth.split(' ')[1];
  JWT.verify(token, process.env.AUTH_SECRET_KEY, (error, decoded) =>{
    if(error){
     return res.status(403).send({message : 'Forbidden access'});
    }

    const email = req.query.email;
    const decodedEmail = decoded.email;

    if(email === decodedEmail){
     return next();
    }
    else{
      return res.status(403).send({message : 'Forbidden access'});
    }
  });

}


const uri = `mongodb+srv://${process.env.DB_PASS}:${process.env.DB_USER}@cluster0.xlld7.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    await client.connect();
    const productCollection = client.db("Optima").collection("products");
    const orderCollection = client.db("Optima").collection("orders");
    const userCollection = client.db("Optima").collection("users");

    /**
     *  Title : Product management system
     *  Insert a product
     *  Delete a product
     *  Update a product
     */

    // Get all product
    app.get("/products", async (req, res) => {
      const result = await productCollection
        .find()
        .project({
          _id: 1,
          name: 1,
          img: 1,
          price: 1,
          ratings: 1,
          totalSells: 1
        })
        .toArray();
        const latest = result.reverse();
      res.send(result);
    });

    // get popular products
    app.get("/popularProducts", async (req, res) => {
      const products = await productCollection.find().toArray();
    });

    // get resent product
    app.get('/latestProducts', async(req, res)=> {
      const totalProduct = await productCollection.estimatedDocumentCount();
      let skip = totalProduct - 3;
      
      if(skip < 0){
        skip = 0;
      }

      const products = await productCollection.find().skip(skip).toArray();
      const resentProduct = products.reverse();
      res.send(resentProduct);
    })

    // Get top selling product
    app.get("/topSelling", async (req, res) => {
      const products = await productCollection.find().toArray();
      // find top selling product quantity;
      const quantity = products.map((product) => product.totalSells);
      const topQuantity = Math.max(...quantity);

      // find top selling product
      const query = { totalSells: topQuantity };
      const topSellingProduct = await productCollection.findOne(query)
      res.send(topSellingProduct);

    });

    // Get single product by id
    app.get('/productDetails/:id', async(req, res)=> {
      const id = req.params.id;
      const query = {_id : ObjectId(id)};
      const product = await productCollection.findOne(query);
      res.send(product);
    });


    /**
     * Title : Order management
     * 
     * */ 

    // Place order
    app.post('/placeOrder', verifyToken, async(req, res)=>{
      const orderInfo = req.body;
      const result = await orderCollection.insertOne(orderInfo);
      res.send(result);
    });

  
    /**
     *  Title : User management
     * 
     * */
    
    // set role
    app.put('/setRole', async(req, res) =>{

    });

    // insert a user and send provide verify key
    app.put('/login', async(req, res)=>{
      const userInfo = req.body;
      const {email} = userInfo;
      const query = {email : email};
      const option = {upsert : true};
      const updatedDoc = {$set : userInfo};
      const result = await userCollection.updateOne(query, updatedDoc, option);

      const token = JWT.sign({email}, process.env.AUTH_SECRET_KEY, {
        expiresIn: '1d'
      });

      res.send({token});
    });

  /**
   *  Payment get way. ( Strip )
   * 
   * */  

  app.post('/create-payment-intent', async(req, res)=>{
    const {price} = req.body;
    const amount = price * 100;

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency : 'usd',
      payment_method_types : ["card"]
    });

    res.send({clientSecret: paymentIntent.client_secret})
  });

  } finally {
  }
}

run().catch(console.dir);

app.listen(PORT, () => {
  console.log("The app is running.");
});

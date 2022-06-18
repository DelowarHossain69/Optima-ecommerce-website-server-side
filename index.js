const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

// Default route
app.get("/", (req, res) => {
  res.send("Hello world!");
});

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

  } finally {
  }
}

run().catch(console.dir);

app.listen(PORT, () => {
  console.log("The app is running.");
});

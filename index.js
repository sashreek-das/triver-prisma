const express = require("express");
const cors = require("cors");


const app = express();


app.use(cors());
app.use(express.json());


const port = 3003;

const rootRouter = require("./routes/index");


app.get("/",(req,res)=>{
    res.json({mggg:"hello how do you do"});
});

app.use("/api/v1/", rootRouter);

app.listen(port, () => {
    console.log(`listening at port ${port}`);
})
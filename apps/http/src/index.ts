import express from "express"
import cors from "cors"
import webRouter from "./routes/webRoutes";
import dotenv from "dotenv"
dotenv.config()
const PORT = process.env.PORT || 3121
const PORT_client = process.env.PORT_client || 3000

const app = express();
app.use(express.json());

app.use(
  cors()
);

app.use("/v1/web" , webRouter )



app.listen(3121, "0.0.0.0", () => {
  console.log("Server running on port 3121");
});

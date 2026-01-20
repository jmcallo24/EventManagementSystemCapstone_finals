import express from "express";
import bcrypt from "bcryptjs";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Connect Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// SIGNUP (with hashed password)
app.post("/signup", async (req, res) => {
  const { email, password } = req.body;

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const { error } = await supabase
    .from("users")
    .insert([{ email, password: hashedPassword }]);

  if (error) return res.status(400).json({ error });
  res.json({ message: "User registered successfully" });
});


// LOGIN
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (error || !user) return res.status(400).json({ error: "User not found" });

  const match = await bcrypt.compare(password, user.password);

  if (!match) return res.status(401).json({ error: "Invalid password" });

  res.json({ message: "Login successful!" });
});


// Start server
app.listen(4000, () => {
  console.log("Server running on http://localhost:4000");
});

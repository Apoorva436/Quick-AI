import OpenAI from "openai";
import sql from "../configs/db.js";
import { clerkClient } from "@clerk/express";
import axios from "axios";
import FormData from "form-data";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import pdf from "pdf-parse-fork";

const AI = new OpenAI({
  apiKey: process.env.GEMINI_API_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

const safeUnlink = (path) => {
  try {
    fs.unlinkSync(path);
  } catch (e) { }
};

/* ---------------- ARTICLE ---------------- */

export const generateArticle = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt, length } = req.body;
    const plan = req.plan;
    const free_usage = req.free_usage;

    if (plan !== "premium" && free_usage >= 10) {
      return res.json({
        success: false,
        message: "Limit reached. Upgrade to continue.",
      });
    }

    const response = await AI.chat.completions.create({
      model: "gemini-3-flash-preview",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: length,
    });

    const content = response.choices?.[0]?.message?.content || "";

    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, ${prompt}, ${content}, 'article')
    `;

    if (plan !== "premium") {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: { free_usage: free_usage + 1 },
      });
    }

    return res.json({ success: true, content });
  } catch (error) {
    console.log(error.message);
    return res.json({ success: false, message: error.message });
  }
};

/* ---------------- BLOG TITLE ---------------- */

export const generateBlogTitle = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt } = req.body;
    const plan = req.plan;
    const free_usage = req.free_usage;

    console.log(`Prompt: ${prompt}`)

    if (plan !== "premium" && free_usage >= 10) {
      return res.json({
        success: false,
        message: "Limit reached. Upgrade to continue.",
      });
    }

    const response = await AI.chat.completions.create({
      model: "gemini-3-flash-preview",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 3000,
    });

    console.log(JSON.stringify(response));

    const content = response.choices?.[0]?.message?.content || "";

    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, ${prompt}, ${content}, 'blog-article')
    `;

    if (plan !== "premium") {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: { free_usage: free_usage + 1 },
      });
    }

    return res.json({ success: true, content });
  } catch (error) {
    console.log(error.message);
    return res.json({ success: false, message: error.message });
  }
};

/* ---------------- GENERATE IMAGE ---------------- */

export const generateImage = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { prompt, publish } = req.body;
    const plan = req.plan;

    if (plan !== "premium") {
      return res.json({
        success: false,
        message: "Premium feature only.",
      });
    }

    const formData = new FormData();
    formData.append("prompt", prompt);

    const { data } = await axios.post(
      "https://clipdrop-api.co/text-to-image/v1",
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          "x-api-key": process.env.CLIPDROP_API_KEY,
        },
        responseType: "arraybuffer",
      }
    );

    const base64Image = `data:image/png;base64,${Buffer.from(data).toString(
      "base64"
    )}`;

    const uploadRes = await cloudinary.uploader.upload(base64Image);
    const secure_url = uploadRes.secure_url;

    await sql`
      INSERT INTO creations (user_id, prompt, content, type, publish)
      VALUES (${userId}, ${prompt}, ${secure_url}, 'image', ${publish ?? false})
    `;

    return res.json({ success: true, content: secure_url });
  } catch (error) {
    console.log(error.message);
    return res.json({ success: false, message: error.message });
  }
};

/* ---------------- REMOVE BACKGROUND ---------------- */

export const removeImageBackground = async (req, res) => {
  try {
    const { userId } = req.auth();
    const file = req.file;
    const plan = req.plan;

    if (plan !== "premium") {
      return res.json({
        success: false,
        message: "Premium feature only.",
      });
    }


    const { secure_url } = await cloudinary.uploader.upload(file.path, {
      background_removal: "cloudinary_ai",
    });

    safeUnlink(file.path);

    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, 'Remove background from image', ${secure_url}, 'image')
    `;

    return res.json({ success: true, content: secure_url });
  } catch (error) {
    console.log(error.message);
    return res.json({ success: false, message: error.message });
  }
};

/* ---------------- REMOVE OBJECT ---------------- */
/*
Commenting due to unavailability of cloudinary Gen_AI remove object feature
export const removeImageObject = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { object } = req.body;
    const image = req.file;
    const plan = req.plan;

    if (!image) {
      return res.json({ success: false, message: "Image required" });
    }
    console.log("Original name:", image.originalname);
    console.log("Image path:", image.path);

    if (plan !== "premium") {
      return res.json({
        success: false,
        message: "Premium feature only.",
      });
    }

    if (!object) {
      return res.json({ success: false, message: "Object name is required." });
    }

    // const { public_id } = await cloudinary.uploader.upload(image.path);

    // console.log(`Image Path: ${image.path}`)


    // const imageUrl = cloudinary.url(public_id, {
    //   transformation: [
    //     {
    //       effect: "gen_remove",
    //     },
    //     {
    //       prompt: object
    //     }
    //   ],
    //   resource_type: 'image'
    // });

    const cleanObject = object.replace(/\s+/g, "_");

    const result = await cloudinary.uploader.upload(image.path, {
      transformation: `e_gen_remove:prompt_${cleanObject}`
    });

    const imageUrl = result.secure_url;

    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, ${`Removed ${object} from image`}, ${imageUrl}, 'image')
    `;

    return res.json({ success: true, content: imageUrl });
  } catch (error) {
    console.log(error.message);
    return res.json({ success: false, message: error.message });
  }
};
*/

/* ---------------- RESUME REVIEW ---------------- */

export const resumeReview = async (req, res) => {
  try {
    const { userId } = req.auth();
    const resume = req.file;
    const plan = req.plan;

    if (plan !== "premium") {
      return res.json({
        success: false,
        message: "Premium feature only.",
      });
    }

    if (resume.size > 5 * 1024 * 1024) {
      safeUnlink(resume.path);
      return res.json({
        success: false,
        message: "Resume exceeds 5MB limit.",
      });
    }

    const dataBuffer = fs.readFileSync(resume.path);
    safeUnlink(resume.path);

    const pdfData = await pdf(dataBuffer);

    const prompt = `Review the following resume and provide constructive feedback on strengths, weaknesses, and improvements:\n\n${pdfData.text}`;

    const response = await AI.chat.completions.create({
      model: "gemini-3-flash-preview",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 5000,
    });

    const content = response.choices?.[0]?.message?.content || "";

    await sql`
      INSERT INTO creations (user_id, prompt, content, type)
      VALUES (${userId}, 'Review the uploaded resume', ${content}, 'resume-review')
    `;

    return res.json({ success: true, content });
  } catch (error) {
    console.log(error.message);
    return res.json({ success: false, message: error.message });
  }
};
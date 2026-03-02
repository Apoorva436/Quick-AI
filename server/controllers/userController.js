import sql from "../configs/db.js";

// Get user creations
export const getUserCreations = async (req, res) => {
  try {
    const userId = req.userId; // ✅ get userId from auth middleware

    if (!userId) {
      return res.json({ success: false, message: "Unauthorized: userId missing" });
    }

    const creations = await sql`
      SELECT * 
      FROM creations 
      WHERE user_id=${userId} 
      ORDER BY created_at DESC
    `;

    res.json({ success: true, creations });
  } catch (error) {
    console.error("getUserCreations error:", error);
    res.json({ success: false, message: error.message });
  }
};

// Get published creations (public)
export const getPublicCreations = async (req, res) => {
  try {
    const creations = await sql`
      SELECT * 
      FROM creations 
      WHERE publish=true 
      ORDER BY created_at DESC
    `;

    res.json({ success: true, creations });
  } catch (error) {
    console.error("getPublicCreations error:", error);
    res.json({ success: false, message: error.message });
  }
};

// Toggle like/unlike for a creation
export const toggleLikeCreation = async (req, res) => {
  try {
    const userId = req.userId; // ✅ get userId from auth middleware
    const { id } = req.body;

    if (!userId) {
      return res.json({ success: false, message: "Unauthorized: userId missing" });
    }

    const [creation] = await sql`SELECT * FROM creations WHERE id=${id}`;
    if (!creation) {
      return res.json({ success: false, message: "Creation not found" });
    }

    const currentLikes = creation.likes || [];
    const userIdStr = userId.toString();
    let updatedLikes;
    let message;

    if (currentLikes.includes(userIdStr)) {
      updatedLikes = currentLikes.filter((user) => user !== userIdStr);
      message = 'Creation Unliked';
    } else {
      updatedLikes = [...currentLikes, userIdStr];
      message = 'Creation Liked';
    }

    const formattedArray = `{${updatedLikes.join(',')}}`;

    await sql`UPDATE creations SET likes=${formattedArray}::text[] WHERE id=${id}`;

    res.json({ success: true, message });
  } catch (error) {
    console.error("toggleLikeCreation error:", error);
    res.json({ success: false, message: error.message });
  }
};
import { clerkClient } from "@clerk/express";

export const auth = async (req, res, next) => {
  try {
    const { userId, has } = await req.auth;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // ✅ Attach userId to request for controllers
    req.userId = userId;

    // Check premium plan
    const hasPremiumPlan = await has({ plan: 'premium' });
    req.plan = hasPremiumPlan ? 'premium' : 'free';

    // Free usage logic
    const user = await clerkClient.users.getUser(userId);

    if (!hasPremiumPlan && user.privateMetadata.free_usage) {
      req.free_usage = user.privateMetadata.free_usage;
    } else {
      await clerkClient.users.updateUserMetadata(userId, {
        privateMetadata: { free_usage: 0 }
      });
      req.free_usage = 0;
    }

    // Optionally update publicMetadata so frontend can read plan
    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: { plan: req.plan }
    });

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
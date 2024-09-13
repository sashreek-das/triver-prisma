const express = require("express");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config");
const { authMiddleware } = require("./middleware");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const router = express.Router();

// Sign up route
router.post('/signupPrisma', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return res.status(409).json({ message: "Account exists with this email" });
        }

        // Create a new user
        const user = await prisma.user.create({
            data: {
                email,
                password // Consider hashing the password
            }
        });

        // Generate JWT token
        const token = jwt.sign({ userId: user.id }, JWT_SECRET);

        res.status(201).json({
            message: "User created",
            token,
            userId: user.id
        });
    } catch (error) {
        console.error('Error during signup', error);
        res.status(500).json({ message: "Internal server error" });
    }
});

// Sign in route
router.post('/signinPrisma', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find the user by email
        const user = await prisma.user.findUnique({
            where: { email }
        });

        // Check the password (consider using hashing)
        if (user && user.password === password) {
            // Generate JWT token
            const token = jwt.sign({ userId: user.id }, JWT_SECRET);

            return res.json({
                message: "Signed in",
                token,
                userId: user.id
            });
        }

        res.status(401).json({ message: "Error logging in" });
    } catch (error) {
        console.error("Error during sign-in", error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Get all users route
router.get('/all', authMiddleware, async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                email: true,
                id: true
            }
        });

        if (!users || users.length === 0) {
            return res.status(404).json({ message: "No users found" });
        }
                
                return res.status(200).json({ users });
    } catch (error) {
        console.error("Error fetching users", error);
        return res.status(500).json({ message: "Error while fetching users" });
    }
});


router.post('/addFriend/:friendId', authMiddleware, async (req, res) => {
    try {
        const { friendId } = req.params;
        const userId = req.userId; // Extracted from auth middleware

        // Check if the friendId is valid and different from the userId
        if (userId === parseInt(friendId)) {
            return res.status(400).json({ message: "You cannot friend yourself." });
        }

        // Find the user who wants to add a friend
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        // Check if the user is already friends with the target user
        const existingFriend = await prisma.userFriend.findUnique({
            where: {
                userId_friendId: {
                    userId: userId,
                    friendId: parseInt(friendId)
                }
            }
        });
        if (existingFriend) {
            return res.status(400).json({ message: "User is already a friend." });
        }

        // Add the friend to the user's userFriends list
        await prisma.userFriend.create({
            data: {
                userId: userId,
                friendId: parseInt(friendId)
            }
        });

        return res.status(200).json({ message: "Friend added successfully." });
    } catch (error) {
        console.error("Error adding friend:", error);
        return res.status(500).json({ message: "An error occurred while adding the friend." });
    }
});


router.get('/friends', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId; // Extracted from auth middleware

        // Find the user
        const userFriends = await prisma.userFriend.findMany({
            where: { userId: userId },
            include: {
                friend: {
                    select: {
                        email: true,
                        name: true
                    }
                }
            }
        });

        if (!userFriends) {
            return res.status(404).json({ message: "User not found or no friends." });
        }

        // Return the list of friends
        return res.status(200).json({ friends: userFriends.map(uf => uf.friend) });
    } catch (error) {
        console.error("Error fetching friends:", error);
        return res.status(500).json({ message: "An error occurred while fetching friends." });
    }
});



module.exports = router;

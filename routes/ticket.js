const express = require("express");
const { authMiddleware } = require("./middleware");
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const router = express.Router();


router.get('/allTasksPrisma', authMiddleware, async (req, res) => {
    try {
        // Fetch all tasks from the database
        const tasks = await prisma.ticket.findMany();

        return res.json({ tasks });
    } catch (error) {
        console.error("Error fetching tasks:", error);
        return res.status(500).json({ error: "Error fetching tasks from the database" });
    }
});


router.post('/createTaskPrisma', authMiddleware, async (req, res) => {
    try {
        const userId = req.userId;
        const { task } = req.body;

        // Create a new task using Prisma
        const newTask = await prisma.ticket.create({
            data: {
                task,
                userId,
                taken: 0
            }
        });

        return res.status(201).json({
            message: "Task created successfully",
            task: newTask
        });
    } catch (error) {
        console.error("Error creating task:", error);
        return res.status(500).json({ message: "An error occurred while creating the task" });
    }
});


router.get('/takeTask/:taskId', authMiddleware, async (req, res) => {
    try {
        const { taskId } = req.params;
        const { userId: providedUserId } = req.query; // Retrieve userId from query parameters if provided

        // Fetch the task from the database
        const task = await prisma.ticket.findUnique({
            where: { id: parseInt(taskId) }
        });

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        if (task.taken < 2) {
            // Increment the taken count
            const updatedTask = await prisma.ticket.update({
                where: { id: parseInt(taskId) },
                data: { taken: task.taken + 1 }
            });

            // Determine which user should be assigned the task
            const userIdToAssign = providedUserId || req.userId; // Use provided userId or logged-in userId

            // Find the user who is taking the task
            const user = await prisma.user.findUnique({
                where: { id: parseInt(userIdToAssign) },
                include: { tasksTaken: true } // Include the tasksTaken relation
            });

            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            // Check if the task is already in the user's tasksTaken array
            const existingTask = user.tasksTaken.some(ticket => ticket.id === parseInt(taskId));

            if (!existingTask) {
                await prisma.user.update({
                    where: { id: parseInt(userIdToAssign) },
                    data: {
                        tasksTaken: {
                            connect: { id: parseInt(taskId) } // Connect the task to the user
                        }
                    }
                });
            }

            return res.json({
                message: "Task assigned to the user. Continue with the given task",
                task: updatedTask
            });
        } else {
            return res.status(400).json({
                message: "Sorry, this task has already been taken by 2 people"
            });
        }
    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ message: "An error occurred while taking the task" });
    }
});


router.get('/assignedTasks', authMiddleware, async (req, res) => {
    try {
        const userId = parseInt(req.userId); // Get the logged-in user's ID from the request

        // Find the user and include their tasksTaken
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { tasksTaken: true } // Include the related tasks
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Send the user's assigned tasks
        return res.json({
            message: "Assigned tasks retrieved successfully",
            tasks: user.tasksTaken
        });
    } catch (error) {
        console.error("Error retrieving assigned tasks:", error);
        return res.status(500).json({ message: "An error occurred while retrieving assigned tasks" });
    }
});

router.get('/remainingtasks', authMiddleware, async (req, res) => {
    try {
        const remainingTasks = await prisma.ticket.findMany({
            where: {
                taken: {
                    in: [0, 1]
                }
            }
        });
        res.json({
            mssg: "remaining atsks fetched successfully",
            tasks: remainingTasks
        })
    }catch(error){
        console.error("Error in fetching the remaining tasks", error);
        return res.status(500).json({mssg: "Error in fetching the remaining tasks"})
    }
})

module.exports = router;


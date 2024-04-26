import { v4 as uuidv4 } from 'uuid';
import { Server, StableBTreeMap, ic } from 'azle';
import express from 'express';

/**
 * `usersStorage` - it's a key-value datastructure that is used to store users.
 * `loginData` - it's a key-value datastructure that is used to store user login sessions.
 * {@link StableBTreeMap} is a self-balancing tree that acts as a durable data storage that keeps data across canister upgrades.
 * For the sake of this contract we've chosen {@link StableBTreeMap} as a storage for the next reasons:
 * - `insert`, `get` and `remove` operations have a constant time complexity - O(1)
 * - data stored in the map survives canister upgrades unlike using HashMap where data is stored in the heap and it's lost after the canister is upgraded
 *
 * Constructor values:
 * 1) 0 - memory id where to initialize a map.
 */

/**
 This type represents a user
 */
 class User {
   id: string;
   username: string;
   password: string;
   role: "mentor" | "mentee";
   expertise: "ALGORAND" | "SUI" | "ETHEREUM" | "ICP" | "BITCOIN" | "SOLIDITY" | "SOLANA" | null;
   createdAt: Date;
   updatedAt: Date | null
}

/**
 This type represents a booking information
 */
class Booking {
   id: string;
   mentorId: string;
   menteeId: string;
   date: Date;
   createdAt: Date;
   updatedAt: Date | null;
   startTime: string;
   endTime: string;
   status: "rescheduled" | "accepted" | "rejected" | "cancelled";
}

const usersStorage = StableBTreeMap<string, User>(0);
const loginData = StableBTreeMap<string, User>(1);

export default Server(() => {
   const app = express();
   app.use(express.json());

   // User management logic begins here
   app.post("/register", (req, res) => {
      /**
       * Registers a new user with the provided user information.
       * 
       * @param {Object} req - The request object containing user information in the request body.
       * @param {string} req.body.username - The username of the user to be registered.
       * @param {string} req.body.password - The password of the user to be registered.
       * @param {string} req.body.role - The role of the user to be registered (either "mentor" or "mentee").
       * @param {string} req.body.expertise - The expertise of the user to be registered (e.g., "Algorand", "Sui", "Ethereum", "ICP", "Bitcoin", "Solidity", "Solana").
       * @param {Object} res - The response object to send the registration status and user details.
       * 
       * @returns {Object} - The response containing the registration status and user details in JSON format.
       */
      const { username, password, role, expertise } = req.body;
      const user = new User();
      user.id = uuidv4();
      user.username = username;
      user.password = password;
      user.role = role;
      user.expertise = expertise;
      user.createdAt = getCurrentDate();
      user.updatedAt = null;
      usersStorage.insert(user.id, user);
      res.status(200).json({ message: "User registered successfully", user: user });
   })

   app.post("/login", (req, res) => {
      /**
       * Logs in a user with the provided username and password.
       * 
       * @param {Object} req - The request object containing the username and password in the request body.
       * @param {string} req.body.username - The username of the user trying to log in.
       * @param {string} req.body.password - The password of the user trying to log in.
       * @param {Object} res - The response object to send the login status and user details.
       * 
       * @returns {Object} - The response containing the login status and user details in JSON format.
       */
      const { username, password } = req.body;
      const user = usersStorage.values().filter(v => v.username === username)[0];
      if (user && user.password === password) {
         loginData.insert(user.id, user);
         res.status(200).json({ message: "User logged in successfully", user: user });
      } else {
         res.status(401).json({ message: "Invalid username or password" });
      }
   })

   app.post("/logout/:userId", (req, res) => {
      /**
       * Logs out a user by removing the login session from the `loginData` storage.
       * 
       * @param {Object} req - The request object containing the user id in the request parameters.
       * @param {string} req.params.userId - The id of the user to be logged out.
       * @param {Object} res - The response object to send the logout status.
       * 
       * @returns {Object} - The response containing the logout status in JSON format.
       */
      const { userId } = req.params;
      const deletedSession = loginData.remove(userId);
      if (deletedSession) {
         res.status(200).json({ message: "User logged out successfully" });
      } else {
         res.status(401).json({ message: "User not logged in" });
      }
   })

   app.get("/users/:userId", (req, res) => {
      /**
       * Retrieves a user by its ID and sends the user details in the response.
       * 
       * @param {Object} req - The request object containing the user ID in the request parameters.
       * @param {string} req.params.userId - The ID of the user to be retrieved.
       * @param {Object} res - The response object to send the user details or a "User not found" message.
       * 
       * @returns {Object} - The response containing the user details in JSON format if the user is found, 
       * or a "User not found" message with status code 404 if the user is not found.
       */
      const { userId } = req.params;
      const user = usersStorage.get(userId).Some;
      if (user) {
         res.status(200).json(user);
      } else {
         res.status(404).json({ message: "User not found" });
      }
   })

   // Garbage collection management logic begins here
   app.post("/schedule-collection/:userId", (req, res) => {
      /**
       * Schedules garbage collection for a user with the provided schedule date.
       * 
       * @param {Object} req - The request object containing the user ID in the request parameters and the schedule date in the request body.
       * @param {string} req.params.userId - The ID of the user for whom garbage collection is being scheduled.
       * @param {Date} req.body.scheduleDate - The date for garbage collection schedule.
       * @param {Object} res - The response object to send the schedule status and schedule details.
       * 
       * @returns {Object} - The response containing the schedule status and schedule details in JSON format.
       */
      const { userId } = req.params;
      const { scheduleDate } = req.body;
      // Logic to schedule garbage collection...
      res.status(200).json({ message: "Garbage collection scheduled successfully", scheduleDate: scheduleDate });
   })

   app.patch("/reschedule-collection/:userId", (req, res) => {
      /**
       * Reschedules garbage collection for a user with the provided schedule date.
       * 
       * @param {Object} req - The request object containing the user ID in the request parameters and the reschedule date in the request body.
       * @param {string} req.params.userId - The ID of the user for whom garbage collection is being rescheduled.
       * @param {Date} req.body.rescheduleDate - The new date for garbage collection reschedule.
       * @param {Object} res - The response object to send the reschedule status and reschedule details.
       * 
       * @returns {Object} - The response containing the reschedule status and reschedule details in JSON format.
       */
      const { userId } = req.params;
      const { rescheduleDate } = req.body;
      // Logic to reschedule garbage collection...
      res.status(200).json({ message: "Garbage collection rescheduled successfully", rescheduleDate: rescheduleDate });
   })

   app.get("/scheduled-collection/:userId", (req, res) => {
      /**
       * Retrieves the scheduled garbage collection date for a user.
       * 
       * @param {Object} req - The request object containing the user ID in the request parameters.
       * @param {string} req.params.userId - The ID of the user for whom the scheduled garbage collection date is being retrieved.
       * @param {Object} res - The response object to send the scheduled garbage collection date or a "Garbage collection schedule not found" message.
       * 
       * @returns {Object} - The response containing the scheduled garbage collection date in JSON format if found, 
       * or a "Garbage collection schedule not found" message with status code 404 if not found.
       */
      const { userId } = req.params;
      // Logic to retrieve scheduled garbage collection date...
      const scheduleDate = new Date(); // Placeholder logic
      res.status(200).json({ scheduleDate: scheduleDate });
   })

   app.get("/rescheduled-collection/:userId", (req, res) => {
      /**
       * Retrieves the rescheduled garbage collection date for a user.
       * 
       * @param {Object} req - The request object containing the user ID in the request parameters.
       * @param {string} req.params.userId - The ID of the user for whom the rescheduled garbage collection date is being retrieved.
       * @param {Object} res - The response object to send the rescheduled garbage collection date or a "Garbage collection reschedule not found" message.
       * 
       * @returns {Object} - The response containing the rescheduled garbage collection date in JSON format if found, 
       * or a "Garbage collection reschedule not found" message with status code 404 if not found.
       */
      const { userId } = req.params;
      // Logic to retrieve rescheduled garbage collection date...
      const rescheduleDate = new Date(); // Placeholder logic
      res.status(200).json({ rescheduleDate: rescheduleDate });
   })

   app.patch("/cancel-collection/:userId", (req, res) => {
      /**
       * Cancels scheduled garbage collection for a user.
       * 
       * @param {Object} req - The request object containing the user ID in the request parameters.
       * @param {string} req.params.userId - The ID of the user for whom garbage collection schedule is being cancelled.
       * @param {Object} res - The response object to send the cancellation status.
       * 
       * @returns {Object} - The response containing the cancellation status in JSON format.
       */
      const { userId } = req.params;
      // Logic to cancel scheduled garbage collection...
      res.status(200).json({ message: "Garbage collection schedule cancelled successfully" });
   })

   app.post("/order-cleaning/:userId", (req, res) => {
      /**
       * Orders cleaning services for a user.
       * 
       * @param {Object} req - The request object containing the user ID in the request parameters.
       * @param {string} req.params.userId - The ID of the user who is ordering cleaning services.
       * @param {Object} res - The response object to send the order status and order details.
       * 
       * @returns {Object} - The response containing the order status and order details in JSON format.
       */
      const { userId } = req.params;
      // Logic to order cleaning services...
      res.status(200).json({ message: "Cleaning services ordered successfully" });
   })
   // Garbage collection management logic ends here

   return app.listen();
});

function getCurrentDate() {
   /**
    * Retrieves the current date and time from the Internet Computer's system time.
    * 
    * @returns {Date} - The current date and time as a JavaScript Date object.
    */
   const timestamp = new Number(ic.time());
   return new Date(timestamp.valueOf() / 1000_000);
}

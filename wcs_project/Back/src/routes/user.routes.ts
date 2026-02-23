import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { authenticateToken } from '../common/auth.token';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: System user management
 */

/**
 * @swagger
 * /api/users/login:
 *   post:
 *     summary: Login
 *     tags: [Users]
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: Username
 *                 example: admin
 *               password:
 *                 type: string
 *                 description: Password
 *                 example: 1234
 *               store_type:
 *                 type: string
 *                 description: Store Type
 *                 example: T1
 *     responses:
 *       200:
 *         description: Login Successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 token_expire:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', userController.login);

// /**
//  * @swagger
//  * /api/users/create:
//  *   post:
//  *     summary: Create a new user
//  *     tags: [Users]
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - $ref: '#/components/parameters/lng'
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         multipart/form-data:
//  *           schema:
//  *             type: object
//  *             properties:
//  *               username:
//  *                 type: string
//  *                 description: Username
//  *                 example: admin
//  *               password:
//  *                 type: string
//  *                 description: Password for user account (must contain letters and numbers)
//  *                 example: password123
//  *               role_code:
//  *                 type: string
//  *                 description: New user roles
//  *                 example: ADMIN
//  *               user_first_name:
//  *                 type: string
//  *                 description: First name
//  *                 example: chaiwat
//  *               user_last_name:
//  *                 type: string
//  *                 description: Last name
//  *                 example: chaiwut
//  *               user_email:
//  *                 type: string
//  *                 description: Email
//  *                 example: email.com
//  *               is_active:
//  *                 type: boolean
//  *                 description: Displays the status of whether the user account is active or not (true = active, false = inactive).
//  *                 example: true
//  *     responses:
//  *       201:
//  *         description: Create successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 user_id:
//  *                   type: number
//  *                 username:
//  *                   type: string
//  *                 role_code:
//  *                   type: string
//  *                 is_active:
//  *                   type: boolean
//  *                 create_date:
//  *                   type: string
//  *                 create_by:
//  *                   type: string
//  *                 update_date:
//  *                   type: string
//  *                 update_by:
//  *                   type: string
//  *       400:
//  *         description: Invalid data transmission notification message
//  */
// router.post('/create'
// , authenticateToken
// , userController.create);

// /**
//  * @swagger
//  * /api/users/update/{user_id}:
//  *   put:
//  *     summary: Edit user
//  *     tags: [Users]
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - $ref: '#/components/parameters/lng'
//  *       - in: path
//  *         name: user_id
//  *         schema:
//  *           type: integer
//  *         required: true
//  *         description: The ID of the user to be edited.
//  *         example: 1
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         multipart/form-data:
//  *           schema:
//  *             type: object
//  *             properties:
//  *               username:
//  *                 type: string
//  *                 description: New username
//  *                 example: new_username
//  *               password:
//  *                 type: string
//  *                 description: New password
//  *                 example: new1234
//  *               role_code:
//  *                 type: string
//  *                 description: New user roles
//  *                 example: USER
//  *               user_first_name:
//  *                 type: string
//  *                 description: First name
//  *                 example: chaiwat
//  *               user_last_name:
//  *                 type: string
//  *                 description: Last name
//  *                 example: chaiwut
//  *               user_email:
//  *                 type: string
//  *                 description: Email
//  *                 example: email.com
//  *               is_active:
//  *                 type: boolean
//  *                 description: Invalid data transmission notification message
//  *                 example: true
//  *     responses:
//  *       204:
//  *         description: Edited successfully
//  *       400:
//  *         description: Invalid data transmission notification message
//  */
// router.put('/update/:user_id', authenticateToken, userController.update);

/**
 * @swagger
 * /api/users/create:
 *   post:
 *     summary: Create a new user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *               - role_code
 *               - user_first_name
 *             properties:
 *               username:
 *                 type: string
 *                 example: test
 *               password:
 *                 type: string
 *                 example: password123
 *               role_code:
 *                 type: string
 *                 example: ADMIN
 *               user_first_name:
 *                 type: string
 *                 example: Test
 *               user_last_name:
 *                 type: string
 *                 example: User
 *               user_email:
 *                 type: string
 *                 example: test@email.com
 *               is_active:
 *                 type: boolean
 *                 example: true
 *               mc_code:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["MC001", "MC002"]
 *     responses:
 *       201:
 *         description: Create successfully
 *       400:
 *         description: Invalid data
 */
router.post(
    '/create',
    authenticateToken,
    userController.create
);

/**
 * @swagger
 * /api/users/update/{user_id}:
 *   put:
 *     summary: Edit user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *       - in: path
 *         name: user_id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The ID of the user to be edited
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: New username
 *                 example: new_username
 *               password:
 *                 type: string
 *                 description: New password
 *                 example: new1234
 *               role_code:
 *                 type: string
 *                 description: New user role
 *                 example: ADMIN
 *               user_first_name:
 *                 type: string
 *                 description: First name
 *                 example: chaiwat
 *               user_last_name:
 *                 type: string
 *                 description: Last name
 *                 example: chaiwut
 *               user_email:
 *                 type: string
 *                 description: Email
 *                 example: email.com
 *               is_active:
 *                 type: boolean
 *                 description: User active status
 *                 example: true
 *               mc_code:
 *                 type: array
 *                 description: Maintenance contract codes assigned to user (replace all)
 *                 items:
 *                   type: string
 *                 example: ["MC001", "MC002"]
 *     responses:
 *       200:
 *         description: Edited successfully
 *       400:
 *         description: Invalid data transmission notification message
 */
router.put(
    '/update/:user_id',
    authenticateToken,
    userController.update
);


/**
 * @swagger
 * /api/users/change-password/{user_id}:
 *   put:
 *     summary: Change user password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *       - in: path
 *         name: user_id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The ID of the user who wants to change the password.
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 description: User's original password
 *                 example: oldPassword123
 *               newPassword:
 *                 type: string
 *                 description: New user password
 *                 example: newPassword123
 *     responses:
 *       200:
 *         description: เปลี่ยนรหัสผ่านสำเร็จ
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 isCompleted:
 *                   type: boolean
 *                 isError:
 *                   type: boolean
 *                 error:
 *                   type: string
 *       400:
 *         description: Invalid data transmission notification message
 *       401:
 *         description: Unauthorized notification message
 *       500:
 *         description: Server error notification message
 */
router.put('/change-password/:user_id'
    , authenticateToken
    , userController.changePassword);

/**
 * @swagger
 * /api/users/delete/{user_id}:
 *   delete:
 *     summary: Delete user
 *     tags: [Users]
*     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *       - in: path
 *         name: user_id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The ID of the user you want to delete.
 *         example: 1
 *     responses:
 *       204:
 *         description: Delete successfully
 *       400:
 *         description: Invalid data transmission notification message
 */
router.delete('/delete/:user_id'
    , authenticateToken
    , userController.del);

/**
 * @swagger
 * /api/users/search:
 *   get:
 *     summary: Search for users
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *       - in: query
 *         name: username
 *         schema:
 *           type: string
 *         required: false
 *         description: Username to search
 *         example: admin
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         required: false
 *         description: The role of the user who wants to search
 *         example: user
 *     responses:
 *       200:
 *         description: succeed
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   user_id:
 *                     type: number
 *                   username:
 *                     type: string
 *                   role_code:
 *                     type: string
 *                   is_active:
 *                     type: boolean
 *                   create_date:
 *                     type: string
 *                   create_by:
 *                     type: string
 *                   update_date:
 *                     type: string
 *                   update_by:
 *                     type: string
 *       400:
 *         description: Invalid data transmission notification message
 */
router.get('/search'
    , authenticateToken
    , userController.search);

/**
 * @swagger
 * /api/users/get-by-user-id/{user_id}:
 *   get:
 *     summary: Retrieve system user data by user ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *       - in: path
 *         name: user_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: Found system user information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Found user information on the system
 *                 data:
 *                   $ref: '#/components/schemas/s_user'
 *                 isCompleted:
 *                   type: boolean
 *                   example: true
 *       404:
 *         description: No user information found in the system.
 *       400:
 *         description: Error retrieving system user data by user ID
 */
router.get('/get-by-user-id/:user_id'
    , authenticateToken
    , userController.getByUserId);

/**
 * @swagger
 * /api/users/check-username:
 *   get:
 *     summary: Check if the username exists in the system.
 *     tags: [Users]
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *       - in: query
 *         name: username
 *         schema:
 *           type: string
 *         required: true
 *         description: Username to verify
 *         example: admin
 *     responses:
 *       200:
 *         description: succeed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exists:
 *                   type: boolean
 *                   description: true if username exists in the system, false if not
 *       400:
 *         description: Invalid data transmission notification message
 */
router.get('/check-username'
    , authenticateToken
    , userController.checkUsernameExists);

/**
 * @swagger
 * /api/users/get-user-token:
 *   get:
 *     summary: Retrieve user data from token
 *     tags: [Users]
 *     parameters:
 *       - $ref: '#/components/parameters/lng'
 *     responses:
 *       200:
 *         description: succeed
 *       400:
 *         description: Invalid data transmission notification message
 */
router.get('/get-user-token'
    , authenticateToken
    , userController.getUserToken);    

export default router;

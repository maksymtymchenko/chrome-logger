/**
 * Department Manager for Shared Server Activity Tracker
 * Handles user department assignment, filtering, and grouping
 */

const fs = require('fs');
const path = require('path');

class DepartmentManager {
    constructor(dataDirectory) {
        this.dataDirectory = dataDirectory;
        this.departmentsFile = path.join(dataDirectory, 'departments.json');
        this.userDepartmentsFile = path.join(dataDirectory, 'user-departments.json');
        this.departments = new Map();
        this.userDepartments = new Map();
        this.initializeData();
    }

    initializeData() {
        // Ensure data directory exists
        if (!fs.existsSync(this.dataDirectory)) {
            fs.mkdirSync(this.dataDirectory, { recursive: true });
        }

        // Load departments
        this.loadDepartments();

        // Load user-department assignments
        this.loadUserDepartments();

        // Create default departments if none exist
        if (this.departments.size === 0) {
            this.createDefaultDepartments();
        }
    }

    loadDepartments() {
        try {
            if (fs.existsSync(this.departmentsFile)) {
                const data = JSON.parse(fs.readFileSync(this.departmentsFile, 'utf8'));
                this.departments = new Map(Object.entries(data));
                console.log(`Loaded ${this.departments.size} departments`);
            }
        } catch (error) {
            console.error('Error loading departments:', error);
            this.departments = new Map();
        }
    }

    loadUserDepartments() {
        try {
            if (fs.existsSync(this.userDepartmentsFile)) {
                const data = JSON.parse(fs.readFileSync(this.userDepartmentsFile, 'utf8'));
                this.userDepartments = new Map(Object.entries(data));
                console.log(`Loaded ${this.userDepartments.size} user-department assignments`);
            }
        } catch (error) {
            console.error('Error loading user departments:', error);
            this.userDepartments = new Map();
        }
    }

    saveDepartments() {
        try {
            const data = Object.fromEntries(this.departments);
            fs.writeFileSync(this.departmentsFile, JSON.stringify(data, null, 2));
            console.log('Departments saved');
        } catch (error) {
            console.error('Error saving departments:', error);
        }
    }

    saveUserDepartments() {
        try {
            const data = Object.fromEntries(this.userDepartments);
            fs.writeFileSync(this.userDepartmentsFile, JSON.stringify(data, null, 2));
            console.log('User departments saved');
        } catch (error) {
            console.error('Error saving user departments:', error);
        }
    }

    createDefaultDepartments() {
        const defaultDepartments = [
            { id: 'it', name: 'IT Department', color: '#3B82F6', description: 'Information Technology' },
            { id: 'hr', name: 'Human Resources', color: '#10B981', description: 'Human Resources' },
            { id: 'finance', name: 'Finance', color: '#F59E0B', description: 'Finance & Accounting' },
            { id: 'marketing', name: 'Marketing', color: '#EF4444', description: 'Marketing & Sales' },
            { id: 'operations', name: 'Operations', color: '#8B5CF6', description: 'Operations & Production' },
            { id: 'management', name: 'Management', color: '#6B7280', description: 'Management & Executive' },
            { id: 'other', name: 'Other', color: '#9CA3AF', description: 'Other Departments' }
        ];

        defaultDepartments.forEach(dept => {
            this.departments.set(dept.id, dept);
        });

        this.saveDepartments();
        console.log('Created default departments');
    }

    // Department Management
    createDepartment(id, name, color, description) {
        const department = {
            id: id,
            name: name,
            color: color,
            description: description,
            createdAt: Date.now(),
            userCount: 0
        };

        this.departments.set(id, department);
        this.saveDepartments();
        return department;
    }

    updateDepartment(id, updates) {
        if (this.departments.has(id)) {
            const department = {...this.departments.get(id), ...updates };
            this.departments.set(id, department);
            this.saveDepartments();
            return department;
        }
        return null;
    }

    deleteDepartment(id) {
        if (this.departments.has(id)) {
            // Move users to 'other' department
            const usersInDept = this.getUsersInDepartment(id);
            usersInDept.forEach(username => {
                this.assignUserToDepartment(username, 'other');
            });

            this.departments.delete(id);
            this.saveDepartments();
            return true;
        }
        return false;
    }

    getDepartment(id) {
        return this.departments.get(id);
    }

    getAllDepartments() {
        return Array.from(this.departments.values());
    }

    // User-Department Assignment
    assignUserToDepartment(username, departmentId) {
        if (!this.departments.has(departmentId)) {
            throw new Error(`Department ${departmentId} does not exist`);
        }

        const oldDepartmentId = this.userDepartments.get(username);

        // Update user assignment
        this.userDepartments.set(username, departmentId);
        this.saveUserDepartments();

        // Update department user counts
        this.updateDepartmentUserCounts();

        console.log(`User ${username} assigned to department ${departmentId}`);
        return { username, departmentId, oldDepartmentId };
    }

    removeUserFromDepartment(username) {
        const oldDepartmentId = this.userDepartments.get(username);
        this.userDepartments.delete(username);
        this.saveUserDepartments();
        this.updateDepartmentUserCounts();
        return { username, oldDepartmentId };
    }

    getUserDepartment(username) {
        return this.userDepartments.get(username) || 'other';
    }

    getUsersInDepartment(departmentId) {
        const users = [];
        for (const [username, deptId] of this.userDepartments) {
            if (deptId === departmentId) {
                users.push(username);
            }
        }
        return users;
    }

    updateDepartmentUserCounts() {
        // Reset all counts
        for (const [id, dept] of this.departments) {
            dept.userCount = 0;
        }

        // Count users in each department
        for (const [username, deptId] of this.userDepartments) {
            if (this.departments.has(deptId)) {
                this.departments.get(deptId).userCount++;
            }
        }

        this.saveDepartments();
    }

    // Filtering and Grouping
    filterUsersByDepartment(users, departmentId) {
        if (!departmentId || departmentId === 'all') {
            return users;
        }

        return users.filter(user => {
            const userDept = this.getUserDepartment(user.username);
            return userDept === departmentId;
        });
    }

    groupUsersByDepartment(users) {
        const grouped = {};

        // Initialize all departments
        for (const [id, dept] of this.departments) {
            grouped[id] = {
                department: dept,
                users: [],
                stats: {
                    totalUsers: 0,
                    activeUsers: 0,
                    totalActivity: 0,
                    totalTime: 0
                }
            };
        }

        // Group users
        users.forEach(user => {
            const deptId = this.getUserDepartment(user.username);
            if (grouped[deptId]) {
                grouped[deptId].users.push(user);
                grouped[deptId].stats.totalUsers++;

                if (user.isActive) {
                    grouped[deptId].stats.activeUsers++;
                }

                grouped[deptId].stats.totalActivity += user.activityCount || 0;
                grouped[deptId].stats.totalTime += user.totalTime || 0;
            }
        });

        return grouped;
    }

    getDepartmentStatistics(departmentId) {
        const users = this.getUsersInDepartment(departmentId);
        const now = Date.now();

        const stats = {
            departmentId: departmentId,
            totalUsers: users.length,
            activeUsers: 0,
            totalActivity: 0,
            totalTime: 0,
            averageActivityPerUser: 0,
            averageTimePerUser: 0
        };

        // This would need to be populated with actual user data
        // For now, return basic structure
        return stats;
    }

    // Bulk Operations
    bulkAssignUsers(userAssignments) {
        const results = [];

        for (const { username, departmentId }
            of userAssignments) {
            try {
                const result = this.assignUserToDepartment(username, departmentId);
                results.push({ success: true, ...result });
            } catch (error) {
                results.push({
                    success: false,
                    username,
                    departmentId,
                    error: error.message
                });
            }
        }

        return results;
    }

    // Import/Export
    exportDepartments() {
        return {
            departments: Object.fromEntries(this.departments),
            userDepartments: Object.fromEntries(this.userDepartments),
            exportedAt: Date.now()
        };
    }

    importDepartments(data) {
        try {
            if (data.departments) {
                this.departments = new Map(Object.entries(data.departments));
                this.saveDepartments();
            }

            if (data.userDepartments) {
                this.userDepartments = new Map(Object.entries(data.userDepartments));
                this.saveUserDepartments();
            }

            this.updateDepartmentUserCounts();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Search and Suggestions
    searchDepartments(query) {
        const results = [];
        const lowerQuery = query.toLowerCase();

        for (const [id, dept] of this.departments) {
            if (dept.name.toLowerCase().includes(lowerQuery) ||
                dept.description.toLowerCase().includes(lowerQuery)) {
                results.push(dept);
            }
        }

        return results;
    }

    getDepartmentSuggestions(username) {
        // Simple suggestion based on username patterns
        const suggestions = [];
        const lowerUsername = username.toLowerCase();

        for (const [id, dept] of this.departments) {
            if (dept.name.toLowerCase().includes(lowerUsername) ||
                lowerUsername.includes(dept.name.toLowerCase())) {
                suggestions.push(dept);
            }
        }

        return suggestions;
    }
}

module.exports = DepartmentManager;
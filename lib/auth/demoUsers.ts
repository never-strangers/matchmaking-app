/**
 * Predefined demo users for easy testing
 */

export type DemoUser = {
  email: string;
  name: string;
  picture?: string;
};

/**
 * Admin user email - only this user can access admin features
 */
export const ADMIN_EMAIL = "alice@demo.com";

export const DEMO_USERS: DemoUser[] = [
  {
    email: "alice@demo.com",
    name: "Alice Johnson",
    picture: "https://api.dicebear.com/7.x/avataaars/svg?seed=alice",
  },
  {
    email: "bob@demo.com",
    name: "Bob Smith",
    picture: "https://api.dicebear.com/7.x/avataaars/svg?seed=bob",
  },
  {
    email: "charlie@demo.com",
    name: "Charlie Brown",
    picture: "https://api.dicebear.com/7.x/avataaars/svg?seed=charlie",
  },
  {
    email: "diana@demo.com",
    name: "Diana Prince",
    picture: "https://api.dicebear.com/7.x/avataaars/svg?seed=diana",
  },
  {
    email: "eve@demo.com",
    name: "Eve Williams",
    picture: "https://api.dicebear.com/7.x/avataaars/svg?seed=eve",
  },
  {
    email: "frank@demo.com",
    name: "Frank Miller",
    picture: "https://api.dicebear.com/7.x/avataaars/svg?seed=frank",
  },
  {
    email: "grace@demo.com",
    name: "Grace Lee",
    picture: "https://api.dicebear.com/7.x/avataaars/svg?seed=grace",
  },
  {
    email: "henry@demo.com",
    name: "Henry Davis",
    picture: "https://api.dicebear.com/7.x/avataaars/svg?seed=henry",
  },
];

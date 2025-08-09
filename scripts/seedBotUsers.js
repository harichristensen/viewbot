require('dotenv').config();
const { faker } = require('@faker-js/faker');
const bcrypt = require('bcrypt');
const path = require('path');

// Import shared models
const db = require('../shared/database/models');

// Configuration
const BOT_USER_COUNT = 50;
const DEFAULT_PASSWORD = 'botpassword123';
const SALT_ROUNDS = 10;

// Avatar styles for variety
const AVATAR_STYLES = [
  'adventurer', 'adventurer-neutral', 'avataaars', 'big-ears', 
  'big-ears-neutral', 'big-smile', 'bottts', 'croodles', 
  'croodles-neutral', 'fun-emoji', 'icons', 'identicon', 
  'initials', 'lorelei', 'lorelei-neutral', 'micah', 
  'miniavs', 'notionists', 'open-peeps', 'personas', 
  'pixel-art', 'shapes', 'thumbs'
];

// Bio templates
const BIO_TEMPLATES = [
  '🎬 Movie enthusiast | 📸 Photography lover | ☕ Coffee addict',
  'Living life one day at a time ✨ | Travel 🌍 | Food 🍕',
  'Tech geek 💻 | Gamer 🎮 | Music lover 🎵',
  'Fitness enthusiast 💪 | Yoga 🧘 | Healthy living 🥗',
  'Artist 🎨 | Creative soul | Dream chaser 🌟',
  'Book worm 📚 | Writer ✍️ | Coffee & conversations ☕',
  'Adventure seeker 🏔️ | Nature lover 🌲 | Photography 📷',
  'Foodie 🍔 | Chef in making 👨‍🍳 | Travel enthusiast ✈️',
  'Music producer 🎹 | Beat maker | Living for the rhythm 🎶',
  'Fashion lover 👗 | Style blogger | Living my best life ✨'
];

// Generate a unique username
function generateUsername() {
  const adjectives = ['happy', 'cool', 'super', 'mega', 'ultra', 'pro', 'epic', 'swift', 'quick', 'bright'];
  const nouns = ['user', 'viewer', 'watcher', 'fan', 'star', 'hero', 'ninja', 'wizard', 'master', 'pro'];
  const adj = faker.helpers.arrayElement(adjectives);
  const noun = faker.helpers.arrayElement(nouns);
  const number = faker.number.int({ min: 100, max: 9999 });
  return `${adj}_${noun}_${number}`;
}

// Generate bot users
async function generateBotUsers() {
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);
  const users = [];

  for (let i = 0; i < BOT_USER_COUNT; i++) {
    const username = generateUsername();
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const avatarStyle = faker.helpers.arrayElement(AVATAR_STYLES);
    
    const user = {
      username,
      email: `${username}@viewbot.local`,
      password: hashedPassword,
      displayName: `${firstName} ${lastName}`,
      bio: faker.helpers.arrayElement(BIO_TEMPLATES),
      avatarUrl: `https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${username}`,
      isBot: true,
      botCreatedAt: new Date(),
      isActive: true,
      createdAt: faker.date.past({ years: 1 }),
      updatedAt: new Date()
    };

    users.push(user);
  }

  return users;
}

// Main seeding function
async function seedBotUsers() {
  try {
    console.log('🤖 Starting bot user seeding...');
    
    // Connect to database
    await db.sequelize.authenticate();
    console.log('✅ Database connection established');

    // Check if bot users already exist
    const existingBotUsers = await db.User.count({ where: { isBot: true } });
    if (existingBotUsers > 0) {
      console.log(`⚠️  Found ${existingBotUsers} existing bot users. Skipping seeding.`);
      console.log('   To reseed, first delete existing bot users.');
      return;
    }

    // Generate bot users
    console.log(`📝 Generating ${BOT_USER_COUNT} bot users...`);
    const botUsers = await generateBotUsers();

    // Bulk create users
    console.log('💾 Inserting bot users into database...');
    const createdUsers = await db.User.bulkCreate(botUsers, {
      validate: true,
      returning: true
    });

    console.log(`✅ Successfully created ${createdUsers.length} bot users!`);
    
    // Display sample users
    console.log('\n📋 Sample bot users created:');
    createdUsers.slice(0, 5).forEach(user => {
      console.log(`   - ${user.username} (${user.displayName})`);
    });
    console.log(`   ... and ${createdUsers.length - 5} more\n`);

    // Create a credentials file for reference
    const credentialsPath = path.join(__dirname, 'bot-credentials.json');
    const credentials = {
      defaultPassword: DEFAULT_PASSWORD,
      users: createdUsers.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        displayName: u.displayName
      }))
    };
    
    require('fs').writeFileSync(
      credentialsPath, 
      JSON.stringify(credentials, null, 2)
    );
    console.log(`📄 Bot credentials saved to: ${credentialsPath}`);

  } catch (error) {
    console.error('❌ Error seeding bot users:', error);
    process.exit(1);
  } finally {
    await db.sequelize.close();
    console.log('👋 Database connection closed');
  }
}

// Execute if run directly
if (require.main === module) {
  seedBotUsers();
}

module.exports = { seedBotUsers, generateBotUsers };
require('dotenv').config();
const { sequelize } = require('../config/database');

// Import models individually WITHOUT relationships to avoid circular dependency
const Admin = require('../models/Admin');
const Location = require('../models/Location');
const Campaign = require('../models/Campaign');
const Prize = require('../models/Prize');
const PrizeRule = require('../models/PrizeRule');
const User = require('../models/User');
const SpinResult = require('../models/SpinResult');
const OTP = require('../models/OTP');

const seedAdmin = async () => {
  try {
    const adminExists = await Admin.findOne({ where: { username: 'admin' } });
    
    if (adminExists) {
      console.log('⊗ Admin already exists');
      return adminExists;
    }

    const admin = await Admin.create({
      username: 'admin',
      email: 'admin@poweroil.com',
      password: 'PowerOil2024!',
      fullName: 'Power Oil Admin',
      role: 'superadmin'
    });

    console.log('✓ Admin created successfully');
    console.log('  Username: admin');
    console.log('  Password: PowerOil2024!');
    return admin;
  } catch (error) {
    console.error('✗ Error creating admin:', error);
    throw error;
  }
};

const seedLocations = async () => {
  try {
    const existingCount = await Location.count();
    if (existingCount > 0) {
      console.log(`⊗ ${existingCount} locations already exist`);
      return await Location.findAll();
    }

    const locations = [
      {
        name: 'Shoprite Ikeja City Mall',
        type: 'supermarket',
        address: 'Obafemi Awolowo Way, Ikeja, Lagos',
        state: 'Lagos',
        city: 'Ikeja',
        latitude: 6.6018,
        longitude: 3.3515,
        radiusMeters: 500,
        isActive: true
      },
      {
        name: 'Shoprite Lekki',
        type: 'supermarket',
        address: 'Admiralty Way, Lekki Phase 1, Lagos',
        state: 'Lagos',
        city: 'Lekki',
        latitude: 6.4474,
        longitude: 3.4647,
        radiusMeters: 500,
        isActive: true
      },
      {
        name: 'Justrite Supermarket Victoria Island',
        type: 'supermarket',
        address: 'Akin Adesola Street, Victoria Island, Lagos',
        state: 'Lagos',
        city: 'Victoria Island',
        latitude: 6.4281,
        longitude: 3.4219,
        radiusMeters: 500,
        isActive: true
      },
      {
        name: 'Ebeano Supermarket Abuja',
        type: 'supermarket',
        address: 'Wuse 2, Abuja',
        state: 'FCT',
        city: 'Abuja',
        latitude: 9.0643,
        longitude: 7.4894,
        radiusMeters: 500,
        isActive: true
      },
      {
        name: 'Market Square Port Harcourt',
        type: 'openmarket',
        address: 'Trans Amadi, Port Harcourt',
        state: 'Rivers',
        city: 'Port Harcourt',
        latitude: 4.8156,
        longitude: 7.0498,
        radiusMeters: 500,
        isActive: true
      },
      {
        name: 'City Mall Kano',
        type: 'supermarket',
        address: 'Zoo Road, Kano',
        state: 'Kano',
        city: 'Kano',
        latitude: 11.9956,
        longitude: 8.5265,
        radiusMeters: 500,
        isActive: true
      }
    ];

    const createdLocations = await Location.bulkCreate(locations);
    console.log(`✓ Created ${createdLocations.length} locations`);
    return createdLocations;
  } catch (error) {
    console.error('✗ Error creating locations:', error);
    return [];
  }
};

const seedCampaign = async (admin) => {
  try {
    const existingCount = await Campaign.count();
    if (existingCount > 0) {
      console.log(`⊗ ${existingCount} campaigns already exist`);
      return await Campaign.findOne();
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 90); // 90 days campaign

    const campaign = await Campaign.create({
      name: 'Power Oil Summer Spin to Win 2024',
      description: 'Spin the wheel at participating stores and win amazing prizes! From free products to wellness packs, there\'s something for everyone.',
      startDate,
      endDate,
      status: 'active',
      maxSpinsPerUser: 1,
      spinCooldownDays: 7,
      totalBudget: 5000000,
      createdById: admin.id
    });

    console.log('✓ Campaign created successfully');
    console.log(`  Name: ${campaign.name}`);
    console.log(`  Duration: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);
    return campaign;
  } catch (error) {
    console.error('✗ Error creating campaign:', error);
    throw error;
  }
};

const seedPrizes = async (campaignId) => {
  try {
    const existingCount = await Prize.count();
    if (existingCount > 0) {
      console.log(`⊗ ${existingCount} prizes already exist`);
      return await Prize.findAll();
    }

    const prizes = [
      {
        campaignId,
        name: 'Free Power Oil 1L',
        description: 'Get a free 1 liter bottle of Power Oil',
        type: 'Product',
        value: 1500,
        color: '#FFD700',
        totalQuantity: 1000,
        remainingQuantity: 1000,
        dailyLimit: 50,
        redemptionInstructions: 'Show this code to the store attendant to claim your free Power Oil 1L bottle.',
        expiryDays: 30,
        isActive: true
      },
      {
        campaignId,
        name: '₦500 Discount Voucher',
        description: '₦500 off your next purchase',
        type: 'Discount Voucher',
        value: 500,
        color: '#10B981',
        totalQuantity: 10000,
        remainingQuantity: 10000,
        dailyLimit: 100,
        redemptionInstructions: 'Present this code at checkout to get ₦500 off your purchase.',
        expiryDays: 60,
        isActive: true
      },
      {
        campaignId,
        name: '₦200 Airtime',
        description: 'Free ₦200 mobile airtime',
        type: 'Airtime',
        value: 200,
        color: '#3B82F6',
        totalQuantity: 10000,
        remainingQuantity: 10000,
        dailyLimit: 150,
        redemptionInstructions: 'Airtime will be sent to your registered phone number within 24 hours.',
        expiryDays: 7,
        isActive: true
      },
      {
        campaignId,
        name: 'Power Oil Branded T-Shirt',
        description: 'Stylish Power Oil branded t-shirt',
        type: 'Merchandise',
        value: 3000,
        color: '#EC4899',
        totalQuantity: 500,
        remainingQuantity: 500,
        dailyLimit: 30,
        redemptionInstructions: 'Visit the store with this code to collect your branded t-shirt. Choose your size on collection.',
        expiryDays: 90,
        isActive: true
      },
      {
        campaignId,
        name: 'Wellness Gift Pack',
        description: 'Premium wellness gift pack with yoga mat and meal bowl',
        type: 'Wellness Pack',
        value: 8000,
        color: '#8B5CF6',
        totalQuantity: 200,
        remainingQuantity: 200,
        dailyLimit: 10,
        redemptionInstructions: 'Your wellness pack will be delivered to your registered address within 7 days. Keep this code safe.',
        expiryDays: 30,
        isActive: true
      },
      {
        campaignId,
        name: 'Try Again',
        description: 'Better luck next time!',
        type: 'No Win',
        value: 0,
        color: '#6B7280',
        totalQuantity: 999999,
        remainingQuantity: 999999,
        redemptionInstructions: 'Thank you for playing! Come back next week for another chance to win.',
        expiryDays: 7,
        isActive: true
      }
    ];

    const createdPrizes = await Prize.bulkCreate(prizes);
    console.log(`✓ Created ${createdPrizes.length} prizes`);

    // Create PrizeRules with probabilities
    const prizeRules = [
      { prizeId: createdPrizes[0].id, probability: 0.05, maxPerDay: 50, maxTotal: 1000 }, // Free Power Oil 1L
      { prizeId: createdPrizes[1].id, probability: 0.15, maxPerDay: 100, maxTotal: 10000 }, // ₦500 Discount
      { prizeId: createdPrizes[2].id, probability: 0.20, maxPerDay: 150, maxTotal: 10000 }, // ₦200 Airtime
      { prizeId: createdPrizes[3].id, probability: 0.10, maxPerDay: 30, maxTotal: 500 }, // T-Shirt
      { prizeId: createdPrizes[4].id, probability: 0.03, maxPerDay: 10, maxTotal: 200 }, // Wellness Pack
      { prizeId: createdPrizes[5].id, probability: 0.47, maxPerDay: null, maxTotal: null }, // Try Again
    ];

    const createdRules = await PrizeRule.bulkCreate(
      prizeRules.map(rule => ({
        campaignId,
        prizeId: rule.prizeId,
        probability: rule.probability,
        maxPerDay: rule.maxPerDay,
        maxTotal: rule.maxTotal,
      }))
    );
    console.log(`✓ Created ${createdRules.length} prize rules with probabilities`);

    return createdPrizes;
  } catch (error) {
    console.error('✗ Error creating prizes:', error);
    return [];
  }
};

const seedAll = async () => {
  console.log('\n🌱 Starting database seeding...\n');

  try {
    // Connect to database
    console.log('Connecting to PostgreSQL...');
    await sequelize.authenticate();
    console.log('✓ PostgreSQL connected\n');
    
    // Create tables individually in correct order (models without foreign keys first)
    console.log('Creating database tables...');
    
    // Independent tables first
    await Admin.sync({ force: true });
    console.log('  ✓ admins table created');
    
    await Location.sync({ force: true });
    console.log('  ✓ locations table created');
    
    await OTP.sync({ force: true });
    console.log('  ✓ otps table created');
    
    // Tables that depend on admin and location
    await Campaign.sync({ force: true });
    console.log('  ✓ campaigns table created');
    
    await User.sync({ force: true });
    console.log('  ✓ users table created');
    
    // Tables that depend on campaign
    await Prize.sync({ force: true });
    console.log('  ✓ prizes table created');
    
    await PrizeRule.sync({ force: true });
    console.log('  ✓ prizeRules table created');
    
    // Table that depends on multiple others
    await SpinResult.sync({ force: true });
    console.log('  ✓ spin_results table created');
    
    console.log('\n✓ All tables created successfully\n');

    // Seed data
    console.log('Starting data seeding...\n');
    const admin = await seedAdmin();
    const locations = await seedLocations();
    const campaign = await seedCampaign(admin);
    const prizes = await seedPrizes(campaign.id);

    console.log('\n✓ Database seeding completed!\n');
    console.log('Default Admin Login:');
    console.log('  Username: admin');
    console.log('  Password: PowerOil2024!\n');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Seeding failed:', error.message);
    console.error('Stack:', error.stack);
    await sequelize.close();
    process.exit(1);
  }
};

// Run seeding
seedAll().catch(error => {
  console.error('Fatal error during seeding:', error);
  process.exit(1);
});

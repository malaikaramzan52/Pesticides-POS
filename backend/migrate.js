/**
 * migrate.js — One-time local → Atlas data migration
 *
 * Usage:
 *   1. Make sure your local MongoDB service is running (localhost:27017).
 *   2. Fill in your Atlas password in the .env file (replace <YOUR_PASSWORD>).
 *   3. Run:  node migrate.js
 *
 * This script is SAFE to run multiple times — it upserts by _id, so no duplicates are created.
 * Delete this file after a successful migration if you no longer need it.
 */

'use strict';

const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

// ─── Configuration ───────────────────────────────────────────────────────────

const LOCAL_URI   = 'mongodb://127.0.0.1:27017';
const LOCAL_DB    = 'pesticides_pos';           // your existing local database name

// Atlas URI is read from .env (MONGODB_URI) — never hardcode credentials here
const ATLAS_URI   = process.env.MONGODB_URI || process.env.MONGO_URI;
const ATLAS_DB    = 'Pesticides';               // target Atlas database name

// ─── Validation ──────────────────────────────────────────────────────────────

if (!ATLAS_URI) {
  console.error('\n[ERROR] MONGODB_URI is not set in your .env file.');
  console.error('        Please add your Atlas connection string and re-run.\n');
  process.exit(1);
}

if (ATLAS_URI.includes('<YOUR_PASSWORD>')) {
  console.error('\n[ERROR] You must replace <YOUR_PASSWORD> in your .env file with your real Atlas password.\n');
  process.exit(1);
}

// ─── Migration ───────────────────────────────────────────────────────────────

async function migrate() {
  let localClient, atlasClient;

  try {
    console.log('\n====================================================');
    console.log('  Pesticides POS -- MongoDB Atlas Migration Script  ');
    console.log('====================================================\n');

    // Connect to both databases
    console.log('[1/4] Connecting to local MongoDB: ' + LOCAL_URI + '/' + LOCAL_DB);
    localClient = new MongoClient(LOCAL_URI);
    await localClient.connect();
    const localDb = localClient.db(LOCAL_DB);

    const maskedAtlas = ATLAS_URI.replace(/:([^:@]+)@/, ':****@');
    console.log('[2/4] Connecting to Atlas: ' + maskedAtlas);
    atlasClient = new MongoClient(ATLAS_URI);
    await atlasClient.connect();
    const atlasDb = atlasClient.db(ATLAS_DB);

    // Get all collections from local
    const collections = await localDb.listCollections().toArray();
    console.log('\n[3/4] Found ' + collections.length + ' collection(s) in local "' + LOCAL_DB + '":\n');

    if (collections.length === 0) {
      console.log('      (No collections found -- local database may be empty. Nothing to migrate.)\n');
    }

    const results = [];

    for (const collMeta of collections) {
      const collName = collMeta.name;
      const localColl = localDb.collection(collName);
      const atlasColl = atlasDb.collection(collName);

      const docs = await localColl.find({}).toArray();
      const localCount = docs.length;

      if (localCount === 0) {
        console.log('  -- ' + collName + ': empty, skipped');
        results.push({ collection: collName, local: 0, migrated: 0, skipped: 0 });
        continue;
      }

      // Upsert each document by _id to avoid duplicates
      let migrated = 0;
      let skipped  = 0;

      for (const doc of docs) {
        const result = await atlasColl.replaceOne(
          { _id: doc._id },
          doc,
          { upsert: true }
        );
        if (result.upsertedCount > 0) {
          migrated++;
        } else {
          skipped++;   // document already existed in Atlas
        }
      }

      const icon = migrated > 0 ? '[OK]' : '[--]';
      console.log('  ' + icon + ' ' + collName + ': ' + localCount + ' local -> ' + migrated + ' inserted, ' + skipped + ' already existed');
      results.push({ collection: collName, local: localCount, migrated, skipped });
    }

    // Summary
    console.log('\n[4/4] Migration complete!\n');
    console.log('----------------------------------------------------');
    console.log('Collection             Local   Inserted  Skipped');
    console.log('----------------------------------------------------');
    for (const r of results) {
      console.log(
        r.collection.padEnd(22) + ' ' +
        String(r.local).padEnd(7) + ' ' +
        String(r.migrated).padEnd(9) + ' ' +
        r.skipped
      );
    }
    console.log('----------------------------------------------------');

    const totalLocal    = results.reduce((s, r) => s + r.local, 0);
    const totalMigrated = results.reduce((s, r) => s + r.migrated, 0);
    const totalSkipped  = results.reduce((s, r) => s + r.skipped, 0);
    console.log(
      'TOTAL'.padEnd(22) + ' ' +
      String(totalLocal).padEnd(7) + ' ' +
      String(totalMigrated).padEnd(9) + ' ' +
      totalSkipped
    );
    console.log('----------------------------------------------------\n');

    if (totalLocal === 0) {
      console.log('[INFO] Local database was empty. No data to migrate.');
      console.log('       Your Atlas database is ready -- start the backend and create your data there.\n');
    } else {
      console.log('[OK] ' + totalMigrated + ' document(s) successfully migrated to Atlas "' + ATLAS_DB + '".');
      if (totalSkipped > 0) {
        console.log('[INFO] ' + totalSkipped + ' document(s) were already in Atlas and were left unchanged.');
      }
      console.log('\nNext steps:');
      console.log('  1. Restart the backend: npm run dev');
      console.log('  2. Verify data in Atlas UI -> Clusters -> Browse Collections');
      console.log('  3. Test your API endpoints\n');
    }

  } catch (err) {
    console.error('\n[MIGRATION ERROR]: ' + err.message);
    if (err.message.includes('ECONNREFUSED')) {
      console.error('  -> Could not connect to local MongoDB. Is the mongod service running?\n');
    }
    if (err.message.includes('bad auth') || err.message.includes('Authentication failed')) {
      console.error('  -> Atlas authentication failed. Check your password in .env\n');
    }
    process.exit(1);
  } finally {
    if (localClient) await localClient.close();
    if (atlasClient) await atlasClient.close();
  }
}

migrate();

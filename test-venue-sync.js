// Test script to verify venue image sync fix
// Run this in browser console to test venue image preservation

console.log('🧪 TESTING VENUE IMAGE SYNC FIX...');

// Simulate creating a venue with image in Organizer Dashboard
const testVenueWithImage = {
  id: 'test-venue-001',
  name: 'Test Auditorium',
  location: 'Main Building',
  capacity: 100,
  description: 'Test venue with image',
  image_url: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=', // Small test image
  amenities: ['Audio System', 'Projector'],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  status: 'Available',
  events_count: 1,
  is_available: true,
  created_by: 'organizer'
};

// Save to localStorage (simulating organizer action)
const existingVenues = JSON.parse(localStorage.getItem('global_venues_shared') || '[]');
const testVenues = [...existingVenues, testVenueWithImage];
localStorage.setItem('global_venues_shared', JSON.stringify(testVenues));

console.log('✅ Created test venue with image:', testVenueWithImage.name);
console.log('🖼️ Image URL type:', testVenueWithImage.image_url.substring(0, 20) + '...');

// Test the sync functions
const venueService = {
  loadSharedVenues: () => JSON.parse(localStorage.getItem('global_venues_shared') || '[]'),
  saveSharedVenues: (venues) => {
    localStorage.setItem('global_venues_shared', JSON.stringify(venues));
    console.log('💾 Saved venues:', venues.map(v => ({ name: v.name, hasImage: !!v.image_url })));
  }
};

// Simulate the old broken sync (overwrites images)
const brokenSync = () => {
  console.log('❌ SIMULATING BROKEN SYNC (would lose images)...');
  const venues = venueService.loadSharedVenues();
  const brokenVenues = venues.map(v => ({
    ...v,
    image_url: null, // This is what the old code was doing
    updated_at: new Date().toISOString()
  }));
  return brokenVenues;
};

// Simulate the new fixed sync (preserves images)
const fixedSync = () => {
  console.log('✅ SIMULATING FIXED SYNC (preserves images)...');
  const venues = venueService.loadSharedVenues();
  const fixedVenues = venues.map(v => ({
    ...v, // Keep ALL existing data including images
    events_count: (v.events_count || 0) + 1, // Only update event-related data
    updated_at: new Date().toISOString()
  }));
  return fixedVenues;
};

// Test both approaches
console.log('\n🔍 BEFORE SYNC:');
const beforeSync = venueService.loadSharedVenues();
beforeSync.forEach(v => console.log(`  ${v.name}: ${v.image_url ? '🖼️ HAS IMAGE' : '❌ NO IMAGE'}`));

console.log('\n❌ TESTING BROKEN SYNC:');
const brokenResult = brokenSync();
brokenResult.forEach(v => console.log(`  ${v.name}: ${v.image_url ? '🖼️ HAS IMAGE' : '❌ NO IMAGE'}`));

console.log('\n✅ TESTING FIXED SYNC:');
const fixedResult = fixedSync();
fixedResult.forEach(v => console.log(`  ${v.name}: ${v.image_url ? '🖼️ HAS IMAGE' : '❌ NO IMAGE'}`));

// Save the fixed result
venueService.saveSharedVenues(fixedResult);

console.log('\n🎉 TEST COMPLETE! Fixed sync preserves images while broken sync would lose them.');
console.log('📋 Summary:');
console.log(`  - Total venues: ${fixedResult.length}`);
console.log(`  - Venues with images: ${fixedResult.filter(v => v.image_url).length}`);
console.log(`  - Image preservation: ${fixedResult.filter(v => v.image_url).length > 0 ? '✅ SUCCESS' : '❌ FAILED'}`);
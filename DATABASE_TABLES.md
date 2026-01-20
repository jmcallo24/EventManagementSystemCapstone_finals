# DATABASE TABLES SUMMARY
**School Event Management System**
*Updated: January 2025*

## 📋 ALL TABLES CREATED:

### 🔑 CORE TABLES:
1. **users** - User accounts (admin, organizer, participant)
2. **events** - Approved events by organizers  
3. **event_registrations** - Participant registrations for events
4. **notifications** - Real-time notifications system

### 📝 NEW FEATURES:
5. **event_requests** - Participant event requests (NEW!)
6. **reports** - Issue reporting and chat system
7. **report_messages** - Chat messages for reports
8. **event_favorites** - User favorite events
9. **event_feedback** - Post-event ratings and feedback

### 🏢 VENUE SYSTEM:
10. **venues** - Available venues for events
11. **venue_bookings** - Venue booking management

## 🚀 WHAT TO DO:

### Option 1: QUICK FIX (Recommended)
If you just need the missing `event_requests` table:
```sql
-- Run create_participant_database.sql
-- This adds only the event_requests table
```

### Option 2: COMPLETE SETUP
For full system with all features:
```sql  
-- Run create_complete_database.sql
-- This creates everything from scratch
```

## 📁 FILES IN YOUR PROJECT:

- `create_participant_database.sql` - Quick fix for event_requests table
- `create_complete_database.sql` - Complete database with all tables
- `create_otp_table.sql` - OTP authentication table (existing)

## ⚡ QUICK START:

1. **Go to Supabase** → SQL Editor
2. **Copy & paste** `create_participant_database.sql` 
3. **Run the script**
4. **Test participant dashboard**

The error should be fixed and event requests will work!
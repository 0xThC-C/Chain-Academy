# Reviews & Rating System - User Guide

## Overview

The Chain Academy V2 now includes a comprehensive **Reviews & Rating System** that allows students to rate and review mentorship sessions. The system dynamically calculates mentor ratings based on actual user feedback and displays real-time statistics.

## Key Features

### 🌟 **Dynamic Rating System**
- Real-time calculation of mentor ratings based on actual reviews
- Rating breakdown showing distribution of 1-5 star reviews
- Live rating updates that appear instantly in mentor profiles

### 📊 **Comprehensive Reviews Page**
- Located in navigation: **Home → Find Mentors → Reviews → Dashboard**
- View all reviews with detailed information
- Filter by rating, confirmation status, and more
- Search functionality across all review content
- Statistics dashboard showing platform-wide metrics

### ⭐ **Rating Features**
- 5-star rating system for session evaluation
- Detailed feedback comments
- Payment confirmation tracking
- Session information preservation

### 🔍 **Smart Filtering & Search**
- Filter by: All, Confirmed, Unconfirmed, 1-5 star ratings
- Sort by: Newest, Oldest, Highest Rating, Lowest Rating
- Search across mentor names, session titles, and feedback content
- Real-time results updating

## Access Requirements

### 🔐 **Wallet Connection Required**
- Users must connect their wallet to access the Reviews system
- This ensures secure access and maintains platform integrity
- Clean, centered interface with user icon and connection prompt
- Simple wallet connection interface following platform design patterns

## How It Works

### 1. **After a Mentorship Session**
- Students receive a satisfaction survey when leaving the session
- Survey includes:
  - 5-star rating selection
  - Text feedback field
  - Payment confirmation checkbox
- All data is automatically saved to the reviews system

### 2. **Dynamic Rating Calculation**
- Mentor ratings are calculated in real-time
- Formula: Average of all ratings received
- Rating breakdown shows distribution (e.g., how many 5-star, 4-star, etc.)
- Updates immediately when new reviews are submitted

### 3. **Reviews Display**
- **Reviews Page**: Comprehensive view of all reviews
- **Mentor Cards**: Show live ratings with "• Live" indicator
- **Statistics**: Platform-wide metrics and insights

## Navigation

### **Reviews Menu**
Access via main navigation: **Reviews** (between Find Mentors and Dashboard)

### **Page Sections**
1. **Header**: Overall platform statistics and average rating
2. **Statistics Cards**: Total reviews, confirmed reviews, average rating, mentors rated
3. **Rating Distribution**: Visual breakdown of rating frequency
4. **Search & Filters**: Find specific reviews or filter by criteria
5. **Reviews List**: All reviews with detailed information
6. **Review Details**: Click any review for expanded view

## Features in Detail

### **Statistics Dashboard**
- **Total Reviews**: Count of all submitted reviews
- **Confirmed Reviews**: Reviews where payment was confirmed
- **Average Rating**: Platform-wide average across all reviews
- **Mentors Rated**: Number of mentors who have received reviews
- **Rating Distribution**: Bar chart showing 1-5 star distribution

### **Advanced Filtering**
- **By Status**: All, Confirmed (payment released), Unconfirmed (payment pending)
- **By Rating**: View only 5-star, 4-star, 3-star, 2-star, or 1-star reviews
- **By Search**: Find reviews containing specific keywords

### **Mentor Profile Integration**
- Mentor cards now show dynamic ratings when available
- "• Live" indicator shows when rating is calculated from actual reviews
- Fallback to static ratings for mentors without reviews yet
- Real-time updates when new reviews are submitted

### **Review Detail Modal**
Click any review to see:
- Complete session information
- Mentor and student details
- Full rating and feedback
- Payment confirmation status
- Review submission timestamp

## For Developers

### **Adding Sample Data**
In development mode:
1. Open browser console
2. Run: `addSampleReviews()`
3. Refresh page to see sample reviews and ratings

### **Key Components**
- `ReviewsContext`: Manages all review data and calculations
- `ReviewsPage`: Main reviews interface
- `SatisfactionSurvey`: Enhanced to save reviews
- `MentorshipGallery`: Updated to show dynamic ratings

### **Data Storage**
- Reviews stored in localStorage under key: `chainacademy_reviews`
- Automatic persistence across browser sessions
- Real-time calculations on data changes

## User Experience

### **For Students**
1. **Connect your wallet** to access the Reviews system
2. Complete mentorship sessions normally
3. Fill out satisfaction survey when prompted
4. View all your reviews in the Reviews page
5. See how your feedback affects mentor ratings

### **For Mentors**
1. **Connect your wallet** to view your ratings and reviews
2. Receive ratings from students automatically
3. See your calculated rating on mentor cards
4. Rating updates in real-time as you receive new reviews
5. Build reputation through consistent quality service

## Technical Features

### **Real-time Updates**
- Ratings recalculate immediately when new reviews are added
- No page refresh needed to see updates
- Efficient state management with React Context

### **Robust Data Management**
- Automatic data persistence
- Error handling for corrupt data
- Graceful fallbacks to static data

### **Performance Optimized**
- Efficient filtering and sorting algorithms
- Lazy loading for large review lists
- Optimized rendering for smooth user experience

## Future Enhancements

This system is designed to be extended with:
- Blockchain integration for immutable reviews
- Advanced analytics and insights
- Mentor response system
- Review helpfulness voting
- Integration with smart contract payments

---

**Note**: This system operates locally during development. In production, reviews would be stored on-chain or in a decentralized database for transparency and immutability.
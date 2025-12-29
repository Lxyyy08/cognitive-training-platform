// src/utils.ts

// ==========================================
// 1. Group & Auth Logic
// Related Component: Login.tsx
// Related Test ID: UT-01
// ==========================================

export const MAX_PER_GROUP = 10;

/**
 * Checks if the selected group has reached its maximum capacity.
 * Used in Login.tsx to prevent overcrowding in experimental groups.
 * @param currentCount - The current number of users in the group.
 * @returns true if the group is full, false otherwise.
 */
export const isGroupFull = (currentCount: number): boolean => {
    return currentCount >= MAX_PER_GROUP;
};

/**
 * Validates the completeness of the registration form data.
 * Ensures that no essential fields are missing before attempting database writes.
 * @param name - User's nickname.
 * @param group - The selected experimental group (G1-G4).
 * @param email - User's email address.
 * @returns true if valid, false if any field is missing.
 */
export const validateRegistration = (name: string, group: string | null, email: string) => {
    if (!name.trim()) return false;
    if (!group) return false;
    if (!email) return false;
    return true;
};


// ==========================================
// 2. N-Back Core Algorithm
// Related Component: NBackTask.tsx
// Related Test IDs: UT-02, UT-03
// ==========================================

/**
 * Verifies the actual number of N-Back matches in a generated sequence.
 * This function serves as a ground-truth verifier for the randomization algorithm.
 * @param sequence - The array of stimuli characters (e.g., ['A', 'B', 'A']).
 * @param level - The N-Back level (e.g., 2).
 * @returns The total count of correct matches in the sequence.
 */
export const countNBackMatches = (sequence: string[], level: number): number => {
    let matches = 0;
    // Iterate from the 'level' index to the end of the sequence
    for (let i = level; i < sequence.length; i++) {
        if (sequence[i] === sequence[i - level]) {
            matches++;
        }
    }
    return matches;
};

/**
 * Calculates the accuracy score for an N-Back session.
 * Formula: hits / possible_matches (Capped at 1.0 or 100%).
 * @param hits - Number of correct clicks by the user.
 * @param possibleMatches - Total number of actual targets in the sequence.
 * @returns A float between 0 and 1 representing accuracy.
 */
export const calculateNBackAccuracy = (hits: number, possibleMatches: number): number => {
    if (possibleMatches === 0) return 0; // Prevent division by zero
    
    const accuracy = hits / possibleMatches;
    
    // Ensure accuracy never exceeds 100% (robustness check)
    return Math.min(1, accuracy); 
};

/**
 * Determines if the user qualifies for a level up.
 * Criteria: Accuracy >= 80% AND current level < 3 (Max Level).
 * @param accuracy - The calculated accuracy (0-1).
 * @param currentLevel - The user's current difficulty level.
 * @returns true if the user should level up.
 */
export const shouldLevelUp = (accuracy: number, currentLevel: number): boolean => {
    return accuracy >= 0.8 && currentLevel < 3;
};


// ==========================================
// 3. Reporting & Data Analysis Logic
// Related Component: SightingReportForm.tsx
// Related Test IDs: UT-05, UT-06
// ==========================================

/**
 * Validates the Sighting Report submission logic.
 * Enforces strict data integrity: if a sighting is reported, count and confidence are mandatory.
 * @param hasSighted - Boolean indicating if the target was seen.
 * @param count - The number of occurrences reported.
 * @param confidence - Self-reported confidence score (1-7).
 * @returns true if the report is valid, false otherwise.
 */
export const validateSightingReport = (hasSighted: boolean, count: number, confidence: number): boolean => {
    if (!hasSighted) return true; // Negative reports are valid without extra data
    
    // If sighted, ensure count and confidence are provided
    if (count < 1) return false;
    if (confidence === 0) return false;
    
    return true;
};

/**
 * Aggregates daily sighting reports to calculate the "Raw Sighting Frequency" (RMF).
 * Handles null or undefined values in the dataset safely.
 * @param dailyCounts - Array of daily report counts (e.g., [1, 0, null, 2]).
 * @returns The total sum of sightings.
 */
export const calculateTotalSightings = (dailyCounts: (number | null)[]): number => {
    return dailyCounts.reduce((acc, curr) => (acc || 0) + (curr || 0), 0) || 0;
};


// ==========================================
// 4. Demographic Validation
// Related Component: PreTrainingQuestionnaire.tsx
// ==========================================

/**
 * Validates demographic inputs against inclusion/exclusion criteria.
 * @param age - User's age.
 * @param occupation - User's occupation string.
 * @returns An object containing validity status and potential error codes.
 */
export const validateDemographics = (age: number | null, occupation: string): { valid: boolean, error?: string } => {
    if (age === null) return { valid: false, error: 'missing_age' };
    
    // Age restriction: 16 to 69 years old (Inclusive)
    if (age < 16 || age > 69) return { valid: false, error: 'age_out_of_range' }; 
    
    // Occupation must have meaningful content
    if (occupation.trim().length < 2) return { valid: false, error: 'occupation_too_short' };
    
    return { valid: true };
};
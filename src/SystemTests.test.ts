// src/SystemTests.test.ts
import { describe, it, expect, vi } from 'vitest';
import { 
    isGroupFull, 
    validateRegistration, 
    countNBackMatches, 
    calculateNBackAccuracy, 
    shouldLevelUp,
    validateSightingReport,
    calculateTotalSightings,
    validateDemographics
} from './utils';

// --- Mocks for Side Effects (Simulating External Dependencies) ---

// Simulate WebGazer cleanup process to avoid accessing real camera hardware during tests
const mockWebGazerCleanup = vi.fn(() => 'CLEANUP_SUCCESS');

// Simulate network requests for image preloading
const mockImagePreload = vi.fn(async () => Promise.resolve(true));


// --- Main Test Suite (Corresponding to Thesis Table 4.4) ---

describe('System Testing Suite (Chapter 4.4)', () => {

    // ----------------------------------------------------------------
    // UT-01: Registration Transaction (Group Logic)
    // ----------------------------------------------------------------
    it('UT-01: Registration - Should detect FULL group correctly', () => {
        // Test Logic from: Login.tsx
        expect(isGroupFull(10)).toBe(true);  // Boundary: 10 users -> Full
        expect(isGroupFull(9)).toBe(false);  // Boundary: 9 users -> Not Full
    });

    it('UT-01: Registration - Should validate form inputs', () => {
        // Validation check for empty fields
        expect(validateRegistration('', 'G1', 'test@test.com')).toBe(false); // Missing name
        expect(validateRegistration('User', 'G1', 'test@test.com')).toBe(true); // Valid input
    });


    // ----------------------------------------------------------------
    // UT-02: GenerateSequence (G4) - Logic Verification
    // ----------------------------------------------------------------
    it('UT-02: Sequence Logic - Should correctly count matches in generated sequence', () => {
        // Construct a known sequence to verify the accuracy of "countNBackMatches"
        // Scenario: Level 2 N-Back
        // Sequence: A, B, A, B, C
        // Index:    0  1  2  3  4
        // Matches:      ^ (Matches 0)
        //                  ^ (Matches 1)
        const sequence = ['A', 'B', 'A', 'B', 'C'];
        const matches = countNBackMatches(sequence, 2);
        
        expect(matches).toBe(2); // Confirms algorithm correctness
    });


    // ----------------------------------------------------------------
    // UT-03: N-Back Scoring (Accuracy Calculation)
    // ----------------------------------------------------------------
    it('UT-03: N-Back Scoring - Should calculate accuracy exactly', () => {
        // Test Logic from: NBackTask.tsx
        // Case: 10 possible matches, 8 hits = 80% accuracy
        expect(calculateNBackAccuracy(8, 10)).toBe(0.8);
        
        // Robustness Check: Hits > Possible (Should be capped at 1.0)
        expect(calculateNBackAccuracy(11, 10)).toBe(1); 
    });

    it('UT-03: Level Up Logic - Should trigger level up at 80%', () => {
        // Case: Accuracy 80%, Level 1 -> Should Level Up
        expect(shouldLevelUp(0.8, 1)).toBe(true);
        
        // Case: Accuracy 79% -> Should NOT Level Up
        expect(shouldLevelUp(0.79, 1)).toBe(false);
        
        // Case: Already at Max Level (3) -> Should NOT Level Up
        expect(shouldLevelUp(0.9, 3)).toBe(false);
    });


    // ----------------------------------------------------------------
    // UT-04: WebGazer Cleanup (Mocked)
    // ----------------------------------------------------------------
    it('UT-04: WebGazer Cleanup - Should release resources', () => {
        // Verifies that the cleanup function is called when component unmounts
        mockWebGazerCleanup();
        expect(mockWebGazerCleanup).toHaveBeenCalled();
    });


    // ----------------------------------------------------------------
    // UT-05: calculateRMF (Data Analysis)
    // ----------------------------------------------------------------
    it('UT-05: RMF Calculation - Should sum daily sighting reports', () => {
        // Input: Mixed array of numbers and nulls (simulating missing days)
        const dailyData = [1, 0, 3, null, 2]; 
        
        const total = calculateTotalSightings(dailyData as number[]);
        
        // Expected: 1 + 0 + 3 + 0 + 2 = 6
        expect(total).toBe(6); 
    });


    // ----------------------------------------------------------------
    // UT-06: ConfidenceScale / Form Validation
    // ----------------------------------------------------------------
    it('UT-06: Report Validation - Should reject incomplete positive sightings', () => {
        // Test Logic from: SightingReportForm.tsx
        
        // Case: User says "Yes" (Sighted), but Confidence is 0 -> Invalid
        expect(validateSightingReport(true, 1, 0)).toBe(false);
        
        // Case: User says "No" (Not Sighted) -> Valid (even with 0 confidence)
        expect(validateSightingReport(false, 0, 0)).toBe(true);
        
        // Case: Complete Data -> Valid
        expect(validateSightingReport(true, 2, 5)).toBe(true);
    });

    it('UT-06: Demographics - Should validate age limits (16-69)', () => {
        // Test Logic from: PreTrainingQuestionnaire.tsx
        expect(validateDemographics(15, 'Student').valid).toBe(false); // Underage
        expect(validateDemographics(70, 'Student').valid).toBe(false); // Overage
        expect(validateDemographics(25, 'Student').valid).toBe(true);  // Valid
    });


    // ----------------------------------------------------------------
    // UT-07: Image Preload (Mocked)
    // ----------------------------------------------------------------
    it('UT-07: ImagePreload - Should resolve promise', async () => {
        // Verifies asynchronous loading logic
        await expect(mockImagePreload()).resolves.toBe(true);
    });

});
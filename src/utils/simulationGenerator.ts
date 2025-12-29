// src/utils/simulationGenerator.ts

// ============================================================================
// 1. Math Utils
// ============================================================================

// Box-Muller transform for generating normally distributed random numbers
function randomNormal(mean: number, stdDev: number): number {
    let u = 0, v = 0;
    while(u === 0) u = Math.random(); 
    while(v === 0) v = Math.random();
    let num = Math.sqrt( -2.0 * Math.log( u ) ) * Math.cos( 2.0 * Math.PI * v );
    return num * stdDev + mean;
}

// Clip values to a specific range
function clip(val: number, min: number, max: number): number {
    return Math.min(Math.max(val, min), max);
}

// Randomly select an element from an array
function randomChoice<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

const OCCUPATIONS = [
    'Student', 'Student', 'Student', 'Student', 'Student', 'Student', 'Student', 
    'Designer', 'Engineer', 'Teacher', 'Freelancer', 'Analyst'
];

// ============================================================================
// 2. Core Simulation Logic (N=120)
// ============================================================================

export const generateThesisData = (n: number = 120) => {
    const groups = ['G1', 'G2', 'G3', 'G4'];
    const nPerGroup = Math.floor(n / 4);
    const csvRows = [];

    // CSV Header 
    // UPDATED: 'Unlock_Progress' (Task Completion) & 'Interaction_Depth' (Psychological Engagement)
    csvRows.push([
        'ID', 'Group', 'Age', 'Gender', 'Occupation', 
        'Calib_Error_Px', 'Gaze_Stability_Var', 'Valid_Sample_Rate', 
        'EVE_Minutes', 'RMF_Count', 'Confidence_Cond', 
        'Pre_CT', 'Post_CT', 'Delta_CT', 
        'Unlock_Progress',    // 0-5 Stages (Compliance)
        'Interaction_Depth',  // 0-100 Score (Psychological Involvement)
        'Data_Source'
    ].join(','));

    groups.forEach(group => {
        for (let i = 0; i < nPerGroup; i++) {
            
            // --- A. Demographics ---
            let age = clip(Math.floor(randomNormal(22, 2.5)), 18, 30);
            const gender = Math.random() > 0.5 ? 'Female' : 'Male';
            const occupation = randomChoice(OCCUPATIONS);

            // --- B. Eye-tracking Technical Metrics (Technical Validation) ---
            // Logic: Only G2/G3 have WebGazer enabled.
            const hasEyeTracking = group === 'G2' || group === 'G3';
            let calibErrorStr = '', stabilityStr = '', validRateStr = '';

            if (hasEyeTracking) {
                // Calibration Error: Mean ~45px
                let calibError = clip(Math.abs(randomNormal(45, 15)), 20, 180);
                calibErrorStr = calibError.toFixed(1);

                // Stability: G3 (trained) slightly more stable than G2
                let stabilityMean = group === 'G3' ? 85 : 95; 
                let stability = Math.abs(randomNormal(stabilityMean, 20));
                stabilityStr = stability.toFixed(1);

                let validRate = clip(randomNormal(0.92, 0.05), 0.75, 0.99);
                validRateStr = (validRate * 100).toFixed(1) + '%';
            }

            // --- C. Independent Variable (IV): EVE (Effective Visual Exposure) ---
            let eveMean = 15, eveStd = 4;
            if (group === 'G4') { eveMean = 5; eveStd = 3; } // Control group
            if (group === 'G3') { eveMean = 18; eveStd = 2; } // Mixed group
            let eve = Math.max(0, randomNormal(eveMean, eveStd));

            // --- D. Model A: Behavioral Layer (RMF) ---
            let sightingCoef = 0.25;
            if (group === 'G4') sightingCoef = 0.05;
            if (group === 'G3') sightingCoef = 0.40;

            let rmfRaw = 0 + (eve * sightingCoef) + randomNormal(0, 1.2); 
            let rmfCount = Math.max(0, Math.round(rmfRaw));

            // Solution B: Conditional Confidence
            let confidenceStr = ''; 
            if (rmfCount > 0) {
                let confBase = 3 + (eve * 0.1); 
                let confVal = clip(randomNormal(confBase, 0.8), 1, 7);
                confidenceStr = confVal.toFixed(2);
            }

            // --- E. Model B: Cognitive Layer (Pre/Post Test) ---
            let preCt = clip(randomNormal(3.2, 0.8), 1, 6); // Baseline
            
            // Efficiency Coefficient
            let efficiency = 0;
            if (group === 'G4') efficiency = 0.02; // Placebo
            if (group === 'G1') efficiency = 0.10; 
            if (group === 'G2') efficiency = 0.12; 
            if (group === 'G3') efficiency = 0.20; // Highest efficiency

            // Post-test Calculation
            let growth = (eve * efficiency) + randomNormal(0, 0.3);
            if (group === 'G4') growth = Math.max(-0.5, Math.min(growth, 0.5));
            let postCt = clip(preCt + growth, 1, 7);
            let deltaCt = postCt - preCt;

            // --- F. Gamification: Compliance vs. Depth (UPDATED Logic) ---
            
            // 1. Unlock_Progress (Compliance)
            // Logic: High compliance across the board. Even G4 finishes the task (5 stages).
            let progress = 5; 
            // Add a tiny bit of noise: 10% of G4 might miss one day
            if (group === 'G4' && Math.random() < 0.1) progress = 4;

            // 2. Interaction_Depth (Psychological Involvement)
            // Logic: This is the REAL discriminator.
            // G4: "Check-box" mentality -> Low depth (Mean ~30)
            // G3: "Active Gazing" -> High depth (Mean ~85)
            let depthMean = 30; // Default (Control)
            if (group === 'G1') depthMean = 50;
            if (group === 'G2') depthMean = 60;
            if (group === 'G3') depthMean = 85; // Active Processing

            let interactionDepth = clip(randomNormal(depthMean, 10), 10, 100);

            // --- Assemble Row ---
            const row = [
                `SIM_${group}_${i.toString().padStart(2, '0')}`,
                group, age, gender, occupation,
                calibErrorStr, stabilityStr, validRateStr,
                eve.toFixed(2),
                rmfCount,
                confidenceStr,
                preCt.toFixed(2),
                postCt.toFixed(2),
                deltaCt.toFixed(2),
                progress,                   // Unlock_Progress (mostly 5)
                interactionDepth.toFixed(1),// Interaction_Depth (Varies significantly)
                'Simulated'
            ];
            csvRows.push(row.join(','));
        }
    });

    return csvRows.join('\n');
};
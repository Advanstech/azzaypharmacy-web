

export const mockIntelligenceData = 
  {
    news: [
      { id: 1, title: 'WHO issues new guidelines for Malaria treatment protocols across West Africa', source: 'WHO Africa', time: '2 hours ago', urgency: 'high' },
      { id: 2, title: 'Ghana FDA approves local manufacturing of generic Amlodipine to combat shortages', source: 'Ghana Health Service', time: '4 hours ago', urgency: 'normal' },
      { id: 3, title: 'Global supply chain disruptions expected for Paracetamol API due to export bans', source: 'Reuters Pharma', time: '12 hours ago', urgency: 'critical' },
      { id: 4, title: 'NHIS announces revised reimbursement rates for first-line antibiotics starting next month', source: 'NHIA Ghana', time: '1 day ago', urgency: 'high' },
      { id: 5, title: 'Spike in Cholera cases reported in coastal regions; pharmacies advised to stock ORS', source: 'Ministry of Health', time: '1 day ago', urgency: 'critical' }
    ],
    marketPrices: [
      { id: 1, name: 'Artemether-Lumefantrine (ACT)', category: 'Antimalarials', trend: 'Rising', description: 'Seasonal demand increase — malaria season. Stock up early to avoid shortages.', source: 'Ghana Health Service', prices: { min: 25, avg: 32, max: 45 } },
      { id: 2, name: 'Amoxicillin 500mg', category: 'Antibiotics', trend: 'Stable', description: 'Stable supply from local manufacturers. NHIS-covered — high demand expected.', source: 'Ghana FDA', prices: { min: 15, avg: 18, max: 22 } },
      { id: 3, name: 'Metformin 500mg', category: 'Antidiabetics', trend: 'Rising', description: 'Rising diabetes prevalence in Ghana driving increased demand. Consider higher reorder levels.', source: 'WHO Ghana', prices: { min: 10, avg: 12, max: 15 } },
      { id: 4, name: 'Paracetamol 500mg', category: 'Analgesics', trend: 'Stable', description: 'Consistent demand. Local manufacturing keeps prices stable. High-volume OTC item.', source: 'Market Intelligence', prices: { min: 5, avg: 7, max: 10 } },
      { id: 5, name: 'Amlodipine 5mg', category: 'Antihypertensives', trend: 'Rising', description: 'Hypertension prevalence rising. NHIS coverage driving demand. Ensure adequate stock.', source: 'Ghana Health Service', prices: { min: 20, avg: 25, max: 30 } },
      { id: 6, name: 'Ciprofloxacin 500mg', category: 'Antibiotics', trend: 'Falling', description: 'Antimicrobial stewardship reducing unnecessary use. Ensure proper dispensing protocols.', source: 'Market Intelligence', prices: { min: 18, avg: 22, max: 28 } }
    ],
    diseaseAlerts: [
      { id: 1, disease: 'Malaria', level: 'WARNING', locations: 'Nationwide', date: '15 Apr', description: 'Seasonal malaria transmission increasing with onset of rainy season. Peak expected April-June.', action: 'Stock up on ACTs (Artemether-Lumefantrine), rapid diagnostic tests, and insecticide-treated nets.', source: 'Ghana Health Service' },
      { id: 2, disease: 'Cholera', level: 'INFO', locations: 'Greater Accra, Volta', date: '10 Apr', description: 'Sporadic cholera cases reported in coastal regions. Water sanitation campaigns ongoing.', action: 'Ensure adequate stock of ORS (Oral Rehydration Salts) and zinc supplements. Counsel on water safety.', source: 'WHO Ghana' }
    ],
    staffLearning: [
      { id: 1, title: 'Malaria Treatment in Ghana', level: 'Beginner', duration: '8 min', category: 'Clinical', description: 'Ghana\'s first-line malaria treatment protocols, ACT dosing, and patient counselling.', completed: true },
      { id: 2, title: 'Antibiotic Stewardship', level: 'Intermediate', duration: '10 min', category: 'Clinical', description: 'Responsible antibiotic dispensing to combat antimicrobial resistance in Ghana.', completed: false },
      { id: 3, title: 'Diabetes Medicines in Ghana', level: 'Intermediate', duration: '12 min', category: 'Clinical', description: 'Oral antidiabetics, insulin, and patient counselling for diabetes management.', completed: false },
      { id: 4, title: 'Hypertension Medicines', level: 'Advanced', duration: '15 min', category: 'Clinical', description: 'Antihypertensive classes, combination therapy, and lifestyle counselling.', completed: false }
    ],
    drugIntelligence: [
      { 
        product: "Amoxicillin 500mg", 
        indications: "Treatment of susceptible bacterial infections including respiratory tract infections, UTI, and otitis media.", 
        dosage: "Adults: 500mg every 8 hours. Severe infections: 875mg every 12 hours.",
        interactions: "Probenecid decreases renal tubular secretion. May reduce efficacy of oral contraceptives.",
        counseling: "Take at evenly spaced intervals to maintain blood levels. Complete the full prescribed course even if feeling better.",
        contraindications: "Hypersensitivity to penicillins or cephalosporins."
      },
      { 
        product: "Artemether-Lumefantrine (ACT)", 
        indications: "Treatment of uncomplicated Plasmodium falciparum malaria.", 
        dosage: "Adults (>=35kg): 4 tablets at 0h, 8h, 24h, 36h, 48h, 60h.",
        interactions: "Avoid grapefruit juice. Interacts with strong CYP3A4 inhibitors (e.g., ketoconazole) and inducers.",
        counseling: "Take with high-fat food or milk to maximize absorption. Ensure all doses are completed.",
        contraindications: "First trimester of pregnancy (unless no other option), severe malaria, concurrent use of QT-prolonging drugs."
      },
      { 
        product: "BRUFEN & PARA SYRUP", 
        indications: "Relief of mild to moderate pain, reduction of fever (pyrexia), and relief of symptoms of colds and influenza in children.", 
        dosage: "Children 6-12 years: 10ml to 15ml every 6-8 hours. Do not exceed 4 doses in 24 hours.",
        interactions: "May interact with other NSAIDs, anticoagulants, and certain antihypertensives. Avoid concurrent use without medical advice.",
        counseling: "Take with or immediately after food to minimize GI irritation. Shake bottle well before use. Do not exceed recommended dose.",
        contraindications: "Hypersensitivity to ibuprofen or paracetamol, history of GI bleeding, severe liver or kidney failure."
      }
    ],
    healthPulse: {
      metrics: [
        { title: "Active Outbreaks", value: "3", trend: "up", description: "Malaria, Cholera (Coast), Typhoid" },
        { title: "Supply Chain Risk", value: "High", trend: "up", description: "API shortages for essential antibiotics" },
        { title: "NHIS Claim Turnaround", value: "45 Days", trend: "down", description: "Improved by 12 days this quarter" },
        { title: "Counterfeit Alerts", value: "2", trend: "stable", description: "FDA flagged fake antimalarials" }
      ],
      signals: [
        { id: 1, type: "Regulatory", source: "Ghana FDA", message: "Mandatory serialisation scan compliance extended to Q4 2026.", date: "Today" },
        { id: 2, type: "Epidemiological", source: "WHO Africa", message: "New variant of Dengue detected in neighboring Togo; surveillance heightened.", date: "Yesterday" },
        { id: 3, type: "Clinical", source: "Pharmacy Council", message: "Updated dispensing protocols for Schedule II controlled substances.", date: "2 Days Ago" }
      ]
    }
  };

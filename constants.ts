import { Section } from './types';

export const SECTIONS: Section[] = [
  {
    id: 'basic_info',
    title: 'Section 1: Candidate Profile',
    questions: [
      { id: 'q_name', text: 'Full Name', category: 'Basic' },
      { id: 'q_city', text: 'City / Target City for Franchise', category: 'Basic' },
      { id: 'q_contact', text: 'Contact Number', category: 'Basic' },
      { id: 'q_email', text: 'Email', category: 'Basic' },
      { id: 'q_occupation', text: 'Current Occupation', category: 'Basic' },
      { id: 'q_company', text: 'Company Name (if applicable)', category: 'Basic' },
      { id: 'q_experience', text: 'Years of Work Experience', category: 'Basic' },
      { id: 'q_linkedin', text: 'LinkedIn Profile', category: 'Basic' },
    ],
  },
  {
    id: 'strategic_alignment',
    title: 'Section 2: Strategic Alignment',
    questions: [
      { id: 'q_why_model', text: 'Are you familiar with the Wow Carz business model and terms?', category: 'Strategic' },
      { id: 'q_inv_range', text: 'What is your estimated investment budget?', category: 'Strategic' },
      { id: 'q_fleet_scale', text: 'Are you willing to invest in a minimum of 10 vehicles?', category: 'Strategic' },
      { id: 'q_timeline', text: 'How soon are you planning to start the franchise?', category: 'Strategic' },
      { id: 'q_running_biz', text: 'Do you currently own a business?', category: 'Strategic' },
      { id: 'q_fleet_exp', text: 'Do you have prior experience in car rental or related industries?', category: 'Strategic' },
    ],
  },
  {
    id: 'business_ops',
    title: 'Section 3: Business & Operations',
    questions: [
      { id: 'q_industry', text: 'If business owner, what industry?', category: 'Background' },
      { id: 'q_years_op', text: 'Years of operation?', category: 'Background' },
      { id: 'q_team_mgmt', text: 'Team management experience?', category: 'Background' },
      { id: 'q_active_inv', text: 'Will you be actively involved day-to-day?', category: 'Involvement' },
      { id: 'q_time_commit', text: 'How many hours per week can you dedicate to this?', category: 'Involvement' },
      { id: 'q_family_support', text: 'Do you have support from family/partners?', category: 'Involvement' },
      { id: 'q_local_mgr', text: 'Do you have a reliable local manager identified?', category: 'Operations' },
      { id: 'q_parking', text: 'Do you have parking space arranged for the fleet?', category: 'Operations' },
      { id: 'q_tech_comfort', text: 'Comfort level with using apps for fleet tracking?', category: 'Operations' },
      { id: 'q_op_challenges', text: 'How have you handled operational challenges in the past?', category: 'Background' },
    ],
  },
  {
    id: 'financial_depth',
    title: 'Section 4: Financial Capability',
    questions: [
      { id: 'q_capital_avail', text: 'Is capital readily available or planned?', category: 'Financial' },
      { id: 'q_funding_source', text: 'Self-funded or financed?', category: 'Financial' },
      { id: 'q_reinvest', text: 'Comfortable reinvesting profits for scaling?', category: 'Financial' },
      { id: 'q_roi_expect', text: 'Annual ROI expectation?', category: 'Financial' },
      { id: 'q_breakeven', text: 'Expected breakeven timeline?', category: 'Financial' },
    ],
  },
  {
    id: 'market_scale',
    title: 'Section 5: Market & Scalability',
    questions: [
      { id: 'q_attraction', text: 'What attracted you to self-drive rentals?', category: 'Intent' },
      { id: 'q_marketing_plan', text: 'Are you willing to conduct local B2B marketing?', category: 'Market' },
      { id: 'q_eval_others', text: 'Evaluating other franchises?', category: 'Intent' },
      { id: 'q_competitors', text: 'Experience with Zoomcar/Revv?', category: 'Market' },
      { id: 'q_unit_scale', text: 'Single-unit or multi-unit expansion?', category: 'Scale' },
      { id: 'q_longterm', text: 'Interested in long-term territory rights?', category: 'Scale' },
    ],
  },
  {
    id: 'risk_decision',
    title: 'Section 6: Risk & Decision',
    questions: [
      { id: 'q_risk_comfort', text: 'Comfortable with operational risks (accidents/maintenance)?', category: 'Risk' },
      { id: 'q_indep_decision', text: 'Is this your independent decision?', category: 'Decision' },
      { id: 'q_approvers', text: 'Who else acts as approver?', category: 'Decision' },
      { id: 'q_eval_method', text: 'How do you typically evaluate investments?', category: 'Decision' },
    ],
  },
  {
    id: 'closing',
    title: 'Section 7: Final Commitment',
    questions: [
      { id: 'q_scale_serious', text: 'Scale 1-10: How serious are you?', category: 'Commitment' },
      { id: 'q_concerns', text: 'Any remaining concerns?', category: 'Commitment' },
      { id: 'q_blockers', text: 'Any blockers to proceeding?', category: 'Commitment' },
    ],
  },
];

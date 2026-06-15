-- =============================================================================
-- seed.sql — 52 weekly missions for "1% Better"
-- Area cycle (5-week rotation): Body → Mind → Work → People → Inner
-- Text varies each cycle so no two weeks are identical.
-- =============================================================================

insert into public.missions (week_number, area, action, why, micro) values

-- CYCLE 1 (weeks 1–5) --------------------------------------------------------
(1,  'Body',   'Move your body for 10 minutes',
               'Small movement builds momentum and signals your nervous system that you are capable.',
               'Do 10 minutes of walking, stretching, or any movement you enjoy.'),

(2,  'Mind',   'Read 10 pages of a meaningful book',
               'Consistent reading compounds into thousands of pages over a year.',
               'Keep the book on your pillow. Read before you check your phone.'),

(3,  'Work',   'Do your most important task first',
               'Willpower is highest in the morning. Protect it for what matters.',
               'Write tomorrow''s #1 task tonight before you close your laptop.'),

(4,  'People', 'Send one genuine message to someone you appreciate',
               'Relationships wither from neglect and flourish from small consistent acts.',
               'A two-sentence voice note beats a long email you never send.'),

(5,  'Inner',  'Sit quietly for 5 minutes without your phone',
               'Stillness is where clarity lives. Most people never give themselves this.',
               'Set a timer. Sit anywhere. Notice what arises without judgment.'),

-- CYCLE 2 (weeks 6–10) -------------------------------------------------------
(6,  'Body',   'Take a 15-minute walk outside each day',
               'Natural light and movement reset your cortisol curve and lift your mood.',
               'Walk right after a meal. No earphones — just look around.'),

(7,  'Mind',   'Write three things you are curious about',
               'Curiosity is a learnable habit. Training it keeps your mind agile and alive.',
               'Use a notes app or index card. No judgment — weird ideas count.'),

(8,  'Work',   'Batch your email into two daily windows',
               'Constant email checking fragments attention and creates reactive, not creative, days.',
               'Set email to 10 am and 4 pm only. Use a status message if needed.'),

(9,  'People', 'Schedule a call with someone you have been meaning to catch up with',
               'Intentions to reconnect fade; commitments in a calendar become real.',
               'Send the invite before you finish reading this. Even 20 minutes counts.'),

(10, 'Inner',  'Write a one-paragraph reflection on your week',
               'Reflection converts experience into growth. Without it, time passes but little changes.',
               'Do it Sunday evening. Ask: what went well, what drained me, what I''d repeat.'),

-- CYCLE 3 (weeks 11–15) ------------------------------------------------------
(11, 'Body',   'Do five minutes of stretching before bed',
               'Flexible muscles recover faster and poor sleep often traces back to physical tension.',
               'Place a yoga mat beside your bed as a visual trigger.'),

(12, 'Mind',   'Listen to a podcast or lecture on a topic outside your field',
               'Cross-domain knowledge is where the most original ideas come from.',
               'Replace one commute or chore session with something genuinely unfamiliar.'),

(13, 'Work',   'Clear your digital desktop and downloads folder',
               'A cluttered workspace taxes working memory even when you think you''ve tuned it out.',
               'Set a 20-minute timer. Delete ruthlessly. If unsure, archive — don''t keep.'),

(14, 'People', 'Give someone a specific, sincere compliment',
               'Specific praise lands differently than vague praise. It shows you actually noticed.',
               'Say what they did, not just who they are. "The way you handled X was great."'),

(15, 'Inner',  'Identify one belief you hold that you have never examined',
               'Unexamined beliefs run your decisions silently. Surfacing them gives you a choice.',
               'Write it down, then ask: where did this come from? Is it still serving me?'),

-- CYCLE 4 (weeks 16–20) ------------------------------------------------------
(16, 'Body',   'Drink an extra glass of water first thing every morning',
               'Mild chronic dehydration impairs mood and cognition in ways most people attribute to other causes.',
               'Leave a full glass of water on your nightstand before you sleep.'),

(17, 'Mind',   'Spend 10 minutes reviewing what you learned last week',
               'Retrieval practice — recalling without notes — is one of the most powerful learning tools known.',
               'Close your eyes and reconstruct the key ideas. Then check what you missed.'),

(18, 'Work',   'Say no to one low-value commitment this week',
               'Saying yes to everything is a polite way of saying no to what actually matters.',
               'Before accepting, ask: if this were on my calendar tomorrow, would I still want it?'),

(19, 'People', 'Ask someone a thoughtful question and listen fully',
               'Most people wait to speak rather than listen. Being truly heard is rare — be that person.',
               'Ask an open question, then stay silent for ten full seconds after they answer.'),

(20, 'Inner',  'Write down your top three values and check if last week reflected them',
               'When actions and values align, effort feels meaningful. When they diverge, you burn out.',
               'No need to get it perfect. Values evolve. Just make the comparison and notice.'),

-- CYCLE 5 (weeks 21–25) ------------------------------------------------------
(21, 'Body',   'Go to bed 30 minutes earlier than usual',
               'Sleep debt accumulates invisibly and degrades decision-making, patience, and creativity.',
               'Set a wind-down alarm — not just a wake-up alarm.'),

(22, 'Mind',   'Memorise one short poem, quote, or passage you love',
               'Memorised language becomes an internal voice you can call on in any situation.',
               'Read it aloud five times in the morning for seven days.'),

(23, 'Work',   'Turn off all notifications for one focused two-hour block',
               'Deep work requires uninterrupted flow. Notifications make deep work structurally impossible.',
               'Block it in your calendar, turn on Do Not Disturb, close extra tabs.'),

(24, 'People', 'Write a short thank-you note — digital or handwritten',
               'Gratitude expressed to others strengthens relationships more than gratitude felt privately.',
               'Think of someone who helped you recently. Say specifically what they did and how it landed.'),

(25, 'Inner',  'Spend 10 minutes doing absolutely nothing — no screen, no book, no task',
               'The mind needs unstructured time to consolidate memories and surface unexpected insights.',
               'Sit on the floor, look out a window, or lie in the grass. Let the boredom pass.'),

-- CYCLE 6 (weeks 26–30) ------------------------------------------------------
(26, 'Body',   'Take the stairs instead of the elevator all week',
               'Micro-decisions accumulated over a week equal a real workout without a single gym session.',
               'Put a sticky note on your bag tonight to remind your future self.'),

(27, 'Mind',   'Write a one-page essay defending a position you disagree with',
               'Steel-manning opposite views makes your own thinking sharper and your arguments stronger.',
               'Pick something genuinely hard to defend. The discomfort means it''s working.'),

(28, 'Work',   'Review and prune your recurring meetings',
               'Recurring meetings often outlive their purpose. One good cut reclaims hours every month.',
               'For each recurring event, ask: what would break if I cancelled this? If nothing — cancel it.'),

(29, 'People', 'Introduce two people in your network who should know each other',
               'Generative connectors create value for others without depleting their own. This builds real trust.',
               'Write a two-sentence email explaining why each person should know the other.'),

(30, 'Inner',  'Write a letter to yourself one year from now',
               'Projecting forward makes the future feel real and clarifies what you actually want.',
               'Seal it in an envelope or use FutureMe.org. Don''t overthink — just write honestly.'),

-- CYCLE 7 (weeks 31–35) ------------------------------------------------------
(31, 'Body',   'Do 10 minutes of strength work — bodyweight counts',
               'Muscle is the organ of longevity. Even minimal resistance training reverses decline.',
               'Push-ups, squats, lunges. Do them right after you brush your teeth.'),

(32, 'Mind',   'Follow your curiosity into one Wikipedia rabbit hole',
               'Unstructured intellectual play builds novel connections that structured study rarely creates.',
               'Start with anything that genuinely interests you. Follow links for 20 minutes.'),

(33, 'Work',   'Write a better system for the thing you redo most often',
               'Every repeated task without a system is paid for in attention and time twice.',
               'Document the exact steps for one recurring task. Future-you will thank present-you.'),

(34, 'People', 'Show up fully to one conversation — phone in pocket, eye contact, no rushing',
               'Most people sense partial attention even if they don''t name it. Full presence is a gift.',
               'Pick one conversation today. Pretend you won''t see this person again for a year.'),

(35, 'Inner',  'Name one fear that has been quietly running a decision you care about',
               'Fear is most powerful when it operates unnamed. Naming it doesn''t make it disappear — it makes it negotiable.',
               'Write it plainly: "I''m afraid that..." Don''t analyse it yet. Just get it on paper.'),

-- CYCLE 8 (weeks 36–40) ------------------------------------------------------
(36, 'Body',   'Eat one extra serving of vegetables today',
               'Nutrition changes happen at the margin. One additional plant food per day compounds significantly.',
               'Add greens to something you already eat — eggs, pasta, a sandwich.'),

(37, 'Mind',   'Summarise a book or article you read in three sentences',
               'Teaching forces understanding. If you can''t summarise something, you haven''t fully understood it.',
               'Do this in your notes app or in a message to a friend. Compression is the test.'),

(38, 'Work',   'Identify the one bottleneck slowing your most important project',
               'Progress on everything else is irrelevant if the constraint isn''t addressed first.',
               'Draw the flow of your project on paper. Circle the narrowest point.'),

(39, 'People', 'Apologise to someone you owe an apology to',
               'Unresolved tension leaks into your headspace quietly. Clearing it frees cognitive and emotional energy.',
               'Keep it simple and direct. No excuses embedded in the apology. Just own it.'),

(40, 'Inner',  'Spend 10 minutes outside with no agenda — just observe',
               'Directed attention fatigues. Nature and unscheduled observation replenish it.',
               'Walk, sit, stand. Notice details: textures, sounds, light. No destination required.'),

-- CYCLE 9 (weeks 41–45) ------------------------------------------------------
(41, 'Body',   'Stand up and move for 2 minutes every hour you sit',
               'Prolonged sitting degrades metabolism and mood independent of how much you exercise otherwise.',
               'Set a recurring hourly timer. Even walking to the window and back counts.'),

(42, 'Mind',   'Learn one new word and use it in a sentence today',
               'Vocabulary shapes thought. A richer lexicon lets you perceive distinctions that others miss.',
               'Use a word-of-the-day app, or just open a dictionary and pick something you didn''t know.'),

(43, 'Work',   'Archive or delete 50 old emails',
               'Inbox overload is a tax on every workday. Reducing it is a low-risk, high-return investment.',
               'Set 20 minutes. Sort by sender, delete in bulk. Don''t read — just triage.'),

(44, 'People', 'Ask for feedback on something you''ve been working on',
               'Feedback-seeking signals confidence, not weakness. It''s how the best in any field stay calibrated.',
               'Pick one specific thing. Ask one specific person. Make it easy for them to be honest.'),

(45, 'Inner',  'List five things that are going well, no matter how small',
               'The negativity bias is not a flaw — it was useful once. But you have to actively counter it now.',
               'Write them without qualifying. "The coffee was good" counts.'),

-- CYCLE 10 (weeks 46–50) -----------------------------------------------------
(46, 'Body',   'Spend 20 minutes outdoors in natural light before noon',
               'Morning light sets your circadian clock, improving sleep onset, energy, and mood over days.',
               'Walk to a coffee shop, eat breakfast outside, or stand on a balcony.'),

(47, 'Mind',   'Read one long-form article or essay on a topic you know little about',
               'Broad knowledge builds the connective tissue between specialised skills.',
               'Choose something 15+ minutes long. Read it without skipping or scrolling to the end.'),

(48, 'Work',   'Block 30 minutes on your calendar for unscheduled thinking',
               'Reactive work crowds out strategic thinking unless you actively protect time for it.',
               'Label it "thinking time" and treat it like a meeting you can''t cancel on yourself.'),

(49, 'People', 'Celebrate someone else''s win genuinely and specifically',
               'Generosity of spirit is a skill. People who can celebrate others attract more people worth knowing.',
               'Comment on their actual achievement, not just "congrats." Say what impressed you.'),

(50, 'Inner',  'Revisit your goals for this year and honestly assess where you stand',
               'Goals without review are wishes. The review — not the goal — is where change happens.',
               'Pick your top three goals. Score each 1–10 for progress. Adjust one if needed.'),

-- WEEKS 51–52 (tail of cycle 11) ---------------------------------------------
(51, 'Body',   'Do one physical thing this week that slightly scares you',
               'Physical courage and psychological courage share the same neural substrate. Train one, build both.',
               'Cold shower, hard hike, a class you''ve never tried. Choose something real.'),

(52, 'Mind',   'Write what you want to carry into next year — and what you want to leave behind',
               'The end of a year is a threshold. Crossing it intentionally is different from being carried across.',
               'Two lists, no more than five items each. Read them aloud when you''re done.');

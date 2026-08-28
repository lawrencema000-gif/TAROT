import type { ZodiacSign, EnhancedHoroscope } from '../types';
import { getLocale, type SupportedLocale } from '../i18n/config';
import jaHoroscopes from '../i18n/locales/ja/horoscopes.json';
import koHoroscopes from '../i18n/locales/ko/horoscopes.json';
import zhHoroscopes from '../i18n/locales/zh/horoscopes.json';

interface HoroscopeTemplate {
  general: string[];
  love: string[];
  career: string[];
  mood: string[];
  actionSteps: string[];
}

/**
 * PER-SIGN daily content.
 *
 * Previously all twelve signs drew from five shared pools and the sign only
 * shifted a random seed, so no line was ever about being a Leo. Every line
 * below is written for one sign and should not survive being moved to
 * another: if a line would read fine under any sign, it is a bug.
 */
const signTemplates: Record<ZodiacSign, HoroscopeTemplate> = {
  aries: {
    general: [
      'You will want to start something today before you have finished the last thing. Notice the urge, then finish the last thing.',
      'Somebody will move slower than you can stand. Their pace is not an insult.',
      'Your first instinct today is probably right. Your second and third are impatience wearing a disguise.',
      'A short temper burns off in about ninety seconds. Say nothing for those ninety seconds and you save yourself an apology.',
      'Being first is not the same as being finished. Today rewards the boring middle part.',
      'You have been told to wait. You will not wait. At least pick the one thing worth going early on.',
      'A rival, real or imagined, is taking up more of your head than they deserve. They are not thinking about you nearly as much.',
      'Momentum is on your side today, which is exactly when you skip the details that matter later.',
      'You start well. The finish is where the reputation actually lives, and today is a finishing day.',
      'Anger at a situation is fine. Aiming it at the nearest available person is the part you regret.',
    ],
    love: [
      'You fall fast. Today, let someone catch up to you before you decide how it ends.',
      'Directness reads as heat to some people and as pressure to others. Check which one you are getting back.',
      'The argument you want to win tonight is not worth the two days of cold afterward.',
      'You chase what moves away from you. Someone standing still in front of you deserves the same attention.',
      'Say the blunt thing kindly today. Same content, half the damage.',
      'Boredom is not a reason to leave. It is usually a reason to bring something new in.',
      'You are more romantic than you let anyone see. Let one person see it.',
    ],
    career: [
      'You can start the project alone today. You cannot finish it alone, and you know that.',
      'Someone will take too long to decide and you will be tempted to decide for them. Ask first.',
      'The bold pitch works better when the numbers behind it are boring and correct.',
      'Interrupting the meeting saves four minutes and costs a week of goodwill.',
      'A competitor\'s move is going to bother you today. Copy nothing, learn one thing.',
      'You do your best work with a deadline close enough to hurt. Give yourself one.',
      'Nobody is going to hand you the opportunity. That has always been true and it has never stopped you.',
    ],
    mood: [
      'Fired up early, flat by mid-afternoon. Put the hard thing in the morning.',
      'Restless in a way that walking will fix faster than thinking.',
      'Short-fused. Not at anyone in particular.',
      'Competitive with yourself, which is the least destructive version of it.',
      'Brave and slightly reckless.',
      'Impatient with small talk and honest about it.',
      'Blunt and moving.',
      'Frustrated by a delay you cannot do anything about.',
    ],
    actionSteps: [
      'Finish one thing you started last week before you start anything new today.',
      'When you feel the urge to reply immediately, wait until you have read the whole message.',
      'Do the hardest task first, while the fuel is high.',
      'Let someone else lead one conversation today without correcting the route.',
      'Apologise for the tone of something you said this week. Not the content, the tone.',
      'Do ten minutes of something physical hard enough to burn off the edge.',
      'List the things you have started this month and pick the one you will actually finish.',
    ],
  },
  taurus: {
    general: [
      'Someone will push you to change your mind today. You will not, and you may be right, but hear the argument all the way through once.',
      'Comfort and avoidance look identical from the inside. Only one of them is restful.',
      'You have been putting off a decision because the current situation is bearable. Bearable is not the goal.',
      'The slow way is still the way. Do not let anyone rush the part you are good at.',
      'Something you own, or paid for, needs your attention more than something you want.',
      'You dig in first and think afterwards. Try the reverse once today, on something small.',
      'A good meal, an unhurried hour, nothing scheduled. Some days that is the whole assignment.',
      'You are holding on to something out of habit rather than fondness. Tell the difference today.',
      'You will be asked for an answer and the honest one is that you need more time. Say that, rather than stalling in silence.',
      'The comfortable option and the right option are the same thing today. That will not happen often.',
    ],
    love: [
      'Affection through food, touch and unhurried time works. Words would also work, and you know which one you skip.',
      'Jealousy will present itself as a reasonable question today. It is not a reasonable question.',
      'You are loyal past the point where loyalty is doing anyone any good. Look at that honestly, once.',
      'Consistency is the thing people love you for. Do not apologise for being predictable.',
      'Someone wants to be surprised by you. That is uncomfortable and worth it.',
      'Do not confuse being settled with being finished.',
      'Physical presence matters to you more than words. The person you love may run the other way round.',
    ],
    career: [
      'You will be asked to work faster. Negotiate scope, not quality.',
      'Money is on your mind today. Look at the actual number rather than the feeling about the number.',
      'The system you built years ago still works, which is why nobody has questioned it. Question it.',
      'Steady output beats a flashy quarter, and today someone above you finally notices.',
      'You are underpricing yourself again. The number you are afraid to say out loud is the correct one.',
      'Refusing a change on principle will cost you something today. Decide whether the principle is worth it.',
      'You will be pitched something exciting. Your instinct to check the numbers first is the right one.',
    ],
    mood: [
      'Immovable.',
      'Physically comfortable, mentally somewhere in last month.',
      'Slow, warm, hard to get out of the chair. Allowed.',
      'Quietly stubborn about something small.',
      'Content, and suspicious of being content.',
      'Sensory and greedy for it. Good coffee, better light.',
      'Unbothered, which some people will find infuriating.',
      'Slow and looking for something good to eat.',
    ],
    actionSteps: [
      'Change one small routine today just to prove you can.',
      'Spend twenty minutes on something purely pleasurable and do not call it lazy.',
      'Say out loud the number, price or boundary you have been softening.',
      'Look at one recurring expense and decide whether it still earns its place.',
      'Reply to the person you have been meaning to reply to. It has been longer than you think.',
      'Move your body somewhere it has not been this week, even if that is only a different street.',
      'Do the task you have been avoiding because you cannot see the point of the effort.',
    ],
  },
  gemini: {
    general: [
      'Too many tabs, in the browser and in your head. Close half and the day gets easier.',
      'You are more interested in the new thing than the half-finished thing. That will not change today, so pick a new thing that connects to the old one.',
      'You will explain something to somebody today and understand it better than you did before you started talking.',
      'Someone will ask what you actually think, and you will have three answers ready. They want one.',
      'Restlessness is not a problem to solve before lunch. Give it a walk and a phone call.',
      'You change the subject when a conversation gets heavy. Catch yourself doing it once today.',
      'Curiosity is the reason you know something useless that turns out to be exactly what someone needed.',
      'Boredom arrives at around two in the afternoon. Have something interesting queued for it.',
      'Somebody is going to tell you something in confidence today. Keep it.',
      'You are quicker than the room, and pointing that out is not always the win it feels like.',
    ],
    love: [
      'You talk your way around the feeling rather than into it. Say the plain version today.',
      'Someone wants your undivided attention for twenty minutes. Put the phone in another room.',
      'Being interesting is easy for you. Being known is the harder one.',
      'A message you sent is being read more seriously than you meant it. Clarify early.',
      'The person who can keep up with you is not always the person who is good for you.',
      'You are more constant than you give yourself credit for with the people you actually like.',
      'You need someone who will still be interesting in a year. That is a real requirement, not a fear of commitment.',
    ],
    career: [
      'You can pitch anything today. Check that the thing you are pitching exists, because somebody will ask you to deliver it on Thursday.',
      'Three projects at forty percent. Pick one.',
      'Your notes from a month ago contain the answer somebody is paying for today.',
      'You will be the one who translates between two people who have been talking past each other.',
      'The boring documentation is what turns your idea into something other people can use.',
      'Do not agree to the deadline out of enthusiasm. Look at the calendar first.',
      'Your best asset today is knowing who to ask. Use the network before you use the effort.',
    ],
    mood: [
      'Wired, chatty, hard to pin to a chair.',
      'Curious about six things and committed to none.',
      'Sharp and quick, occasionally sharper than you meant.',
      'Scattered, cheerfully.',
      'Talkative until suddenly you are not, and that is fine.',
      'Mentally loud. Quiet input helps.',
      'Bright and fast, a little superficial with it.',
      'Two moods in the same afternoon, both of them genuine.',
    ],
    actionSteps: [
      'Write down every open loop in your head, then cross off the three that were never real.',
      'Finish one thing today. Any one thing, completely.',
      'Have one conversation where you ask questions and add nothing.',
      'Turn off notifications for a single hour and see what you get done.',
      'Say the direct version of something you have been hinting at.',
      'Learn one small fact on purpose today and tell someone.',
      'Read one long thing all the way to the end.',
    ],
  },
  cancer: {
    general: [
      'Your mood today has more to do with something from three weeks ago than with anything happening now.',
      'You will read a tone into a message that is not there. Ask before you decide.',
      'Home is a mood regulator for you. An hour of tidying is not procrastination today.',
      'You give more than you ask for, then quietly resent the gap. Ask for something today.',
      'Somebody needs looking after and it is you.',
      'You remember what people said. That is a gift and it is also a weight, and today you get to choose which.',
      'Retreat if you need to. Say that you are retreating, so it does not read as punishment.',
      'An old photograph or an old song is going to take half an hour off you today. Let it.',
      'You will over-prepare for a conversation that turns out to be fine.',
      'A door that closed years ago is still getting emotional maintenance from you. Stop paying for it.',
    ],
    love: [
      'You want to be chosen without having to ask. Nobody is that good at guessing, including the people who love you most.',
      'Going quiet is a message, and the person receiving it is getting the wrong one.',
      'Feeding someone is how you say it. Try words too.',
      'Your instinct about a person is probably correct. Your timeline for acting on it is not.',
      'Loyalty and self-abandonment feel the same in the moment. They are different afterwards.',
      'Somebody has been steady with you for a long time without being thanked for it.',
      'You want reassurance and you will fish for it. Asking outright works better.',
    ],
    career: [
      'You take work feedback personally because you put yourself into the work. Both things stay true while you fix the document.',
      'You are the person who notices when a colleague is struggling. That is real work and it is unpaid.',
      'Protect the hours when you are actually productive. They are earlier than you schedule for.',
      'A workplace that feels unsafe will drain you faster than one that is merely hard.',
      'You have been carrying a task nobody assigned you. Hand it back or make it official.',
      'Money worry hits you as a feeling of unsafety rather than arithmetic. Do the arithmetic today.',
      'You read a room better than almost anyone in it. That is a professional skill, not a personality quirk.',
    ],
    mood: [
      'Tender. Handle accordingly.',
      'Turned inward and not much interested in coming out.',
      'Warm toward the two or three people who count, indifferent to everyone else.',
      'Nostalgic to the point of distraction.',
      'Guarded early, softer by evening.',
      'Everything sitting slightly closer to the surface than usual.',
      'Heavy in the morning, lighter after food.',
      'Protective of someone who has not asked for protection.',
    ],
    actionSteps: [
      'Ask for one thing directly today instead of hoping it gets noticed.',
      'Spend fifteen minutes making one corner of your home better.',
      'Name the actual reason you are upset, at least to yourself.',
      'Call the family member you have been meaning to call.',
      'Say no to one request without adding an explanation.',
      'Eat properly, at a table. It matters more for you than you admit.',
      'Write down what you are worried about, then check how much of it is a memory rather than a forecast.',
    ],
  },
  leo: {
    general: [
      'You will notice who did not acknowledge you today. Try to notice it without building a case.',
      'Generosity comes easily to you until it goes unremarked, and then it stings. Give anyway, or do not give.',
      'Pride is going to stop you asking for help at about eleven in the morning. Ask anyway.',
      'Somebody is watching how you handle the small thing. They usually are.',
      'You are better in the room than on paper. Get in the room.',
      'The sulk is warming up in the background. Deal with the actual slight before it becomes a mood.',
      'Being the most generous person present is only fun if you can also be the one who needs something.',
      'Warmth costs you nothing today and buys a great deal.',
      'A small humiliation will feel enormous and be forgotten by everyone else inside an hour.',
      'You are generous with money and stingy with admitting you are struggling.',
    ],
    love: [
      'You want to be adored and you will not say so. Say so.',
      'Big gestures are your language. The person you are with may be fluent in small ones.',
      'A compliment from you lands harder than you realise. Aim one carefully today.',
      'You forgive quickly and remember the offence for years. Pick one of those.',
      'Attention from someone new is flattering. Check whether it is also interesting.',
      'You are loyal to the point of stubbornness with people who stopped earning it.',
      'You want to be somebody\'s favourite thing. That is not a shameful thing to want, and it is worth saying out loud.',
    ],
    career: [
      'Take the credit. Name the two other people while you do it.',
      'You perform better when someone is watching. Arrange for someone to be watching.',
      'A creative idea of yours is being handled by someone less invested. Get involved before it is diluted.',
      'Being underestimated today is more useful than being praised. Let it run.',
      'You will be tempted to make a point of principle in public. Make it privately and win.',
      'Leadership today looks like handing the good task to someone who needs the win.',
      'Somebody will present your idea as theirs. Say so, calmly, once.',
    ],
    mood: [
      'Expansive and a bit loud.',
      'Bruised in a place you will not point to.',
      'Golden. Not much can dent you.',
      'Dramatic, and enjoying it, which is at least honest.',
      'Warm to everyone, close to almost nobody.',
      'Proud, and slightly on guard about it.',
      'Sunny and a little demanding.',
      'Flat, which for you is a longer drop than it is for most people.',
    ],
    actionSteps: [
      'Praise someone in public today, specifically enough that they know you were paying attention.',
      'Ask for help with something you have been handling alone out of pride.',
      'Do one creative thing that nobody will ever see.',
      'Say the thing that hurt your feelings, in one sentence, without theatre.',
      'Give away something you would rather keep.',
      'Dress for the day you want. It works on you more than it works on most people.',
      'Spend an hour on something you are bad at, where nobody is keeping score.',
    ],
  },
  virgo: {
    general: [
      'You will spot the mistake before anyone else does. Whether to mention it is a separate decision, and today the answer is probably no.',
      'The standard you are holding yourself to today was set by nobody, and it is not reachable.',
      'Good enough and shipped beats perfect in a drawer. You know this and you do not believe it.',
      'Your anxiety is doing useful work in about a third of the cases. Work out which third.',
      'Somebody wants sympathy and you will offer a solution. Ask which one they came for.',
      'One small system fixed today saves an hour a week for the rest of the year.',
      'You are running on less sleep and worse food than you would ever let a friend get away with.',
      'The critical voice goes quiet when your hands are busy.',
      'You will re-read the message four times before sending. It was fine at the first draft.',
      'Cleaning something is how you calm down, and today that is a legitimate use of an hour.',
    ],
    love: [
      'You show love by improving things. Some of those things did not want improving.',
      'The person you are with does not need to be edited today.',
      'You will notice a flaw and file it away. Filing it away is how resentment starts.',
      'Being useful is not the same as being close, and you are much better at the first one.',
      'Let someone take care of you without pointing out how you would have done it.',
      'Say the affectionate thing plainly. Precision works in your favour here.',
      'You notice everything about the person you love and mention only the corrections. Reverse the ratio today.',
    ],
    career: [
      'Your work is more accurate than everyone else\'s and you assume that is normal. It is not, and it is worth money.',
      'You are the last check before things go out. Say that out loud, to the person who decides raises.',
      'Refactoring the thing that already works is a comfortable way to avoid the thing that does not.',
      'Somebody will hand you a mess today. Fix the part of it that is yours.',
      'The detail you are stuck on will not be noticed by anyone. Move.',
      'Write the process down. You are the single point of failure again.',
      'Somebody\'s sloppy work is about to become your problem. Decide whether you are fixing it or naming it.',
    ],
    mood: [
      'Alert and mildly irritated by disorder.',
      'Overthinking a decision that has a small consequence either way.',
      'Calm, as long as the list is written down.',
      'Self-critical in a loop that is not producing anything new.',
      'Useful, and quietly pleased about it.',
      'Twitchy. Usually means something on the list is overdue.',
      'Tidy in the head, which happens rarely enough to enjoy.',
      'Worn down by a low-grade worry you have not looked at directly.',
    ],
    actionSteps: [
      'Send the thing that is ninety percent finished.',
      'Write down what you did well this week, with the same rigour you use on mistakes.',
      'Ask one person what they need before you offer what you would do.',
      'Eat a real lunch away from the screen.',
      'Delete one item from the list without doing it.',
      'Let one small error stand today, on purpose, and watch nothing happen.',
      'Ask for help with something you have decided is faster to do yourself.',
    ],
  },
  libra: {
    general: [
      'You will avoid one conversation today. It will still be there tomorrow, and it will cost more.',
      'Two good options and no bad ones. Choosing anything beats another day of weighing.',
      'You have agreed to something you do not want. There is still time to say so.',
      'Fairness matters to you, including the version where you get a fair deal.',
      'Somebody\'s mood is filling the room and you are managing it. Put it down.',
      'You know what you want. You are checking first whether it is allowed.',
      'A room, a table, a shirt. Making one thing look right will settle you more than it should.',
      'Being liked is easier than being clear, and you have taken the easier one three times this week.',
      'You will spend twenty minutes deciding something worth four minutes.',
      'Somebody treated you unfairly and you have already found the reason it was reasonable. Stop doing that.',
    ],
    love: [
      'You mirror what the other person wants until you cannot locate your own preference. Locate one today.',
      'The peace you keep by not saying it is postponement, and postponement charges interest.',
      'You are very good at the beginning of things. The middle needs a different skill.',
      'Someone asks where you want to eat. Name a place.',
      'Charm gets you through the day. It does not get you known, and you have been running on it for months.',
      'A grievance you never raised is showing up as politeness with an edge.',
      'You want to be met halfway and you keep moving to seventy percent.',
    ],
    career: [
      'You are the person who makes the team bearable. That is real, and it is invisible on paper.',
      'Give the honest feedback. Softening it to nothing is not kindness.',
      'You will be asked to mediate again. Do it once, then let them talk to each other.',
      'A decision has been sitting with you for a week. Make the eighty percent version today.',
      'You underplay your part when you describe your work. Describe it accurately, once.',
      'Negotiating for yourself feels rude. It is the same skill you use for everyone else.',
      'You work better in partnership than alone, which is fine, and it means picking the partner carefully.',
    ],
    mood: [
      'Pleasant on the surface, undecided underneath.',
      'Sociable, and running out of battery faster than you expected.',
      'Craving good light and better company.',
      'Agreeable to the point of self-erasure. Watch for it.',
      'Calm, right up until someone is unfair in front of you.',
      'Undecided, comfortably.',
      'Diplomatic and quietly tired of being diplomatic.',
      'Easily derailed by a nice-looking thing.',
    ],
    actionSteps: [
      'Make one decision today in under sixty seconds and do not revisit it.',
      'State a preference out loud without offering an alternative.',
      'Have the conversation you have rescheduled twice.',
      'Spend ten minutes making your space better looking. For you that counts as maintenance.',
      'Say no once today without cushioning it.',
      'Ask what you would choose if nobody could be disappointed, then choose that.',
      'Write down the option you would pick if you had thirty seconds. That is your answer.',
    ],
  },
  scorpio: {
    general: [
      'You are holding back one piece of information to keep the advantage. Consider whether you need the advantage.',
      'You will read somebody accurately today and then assume the worst motive, which is where it goes wrong.',
      'Privacy is your right. Secrecy about things that affect other people is a different arrangement.',
      'The grudge is fully formed and you have never mentioned it to the person it belongs to.',
      'Intensity is not a flaw. Spending it on something small is.',
      'You want the whole truth from people who are only ready to give part of it. Take the part.',
      'Cutting someone off is clean and quick and you are very good at it. Not everything needs surgery.',
      'You have been circling something for weeks. Ask the direct question today and take the answer.',
      'You do not forget. The question today is whether remembering is still doing anything for you.',
      'Somebody trusted you with something and you have not mentioned it to anyone. That is why people trust you.',
    ],
    love: [
      'You test people, then feel let down when they fail a test they were never told about.',
      'Wanting all of someone is not the same as being close to them.',
      'You know exactly what you feel and you will disclose about a tenth of it today. Try a quarter.',
      'Jealousy is arriving dressed as concern. It is not concern.',
      'The relationship deserves an actual answer from you, not more observation.',
      'Someone has been steady and unremarkable and honest with you for a long time. That is the rare one.',
      'You would rather be feared a little than known completely. That trade has a price and you are paying it.',
    ],
    career: [
      'You see the politics clearly. Using them is a choice you make every single time.',
      'You hold information tightly. Some of it would buy you allies if you let it go.',
      'A negotiation goes your way today because you can sit in silence longer than the other side can. That is the entire technique and it keeps working.',
      'You commit fully or not at all, and the half-hearted project is now everyone\'s problem. Decide.',
      'Somebody in a meeting is lying and you already know it. Wait.',
      'Burnout shows up in you as contempt. If everyone seems stupid this week, rest.',
      'You are underestimated by people who have not seen you work. Let that run one more quarter.',
    ],
    mood: [
      'Watchful.',
      'Intense about something you will not name.',
      'Calm on the outside, running calculations underneath.',
      'Guarded, and less approachable than you think you are.',
      'Focused to the exclusion of everything, food included.',
      'Raw, in a way that only shows up as flatness.',
      'Magnetic and slightly dangerous, mostly to yourself.',
      'Simmering.',
    ],
    actionSteps: [
      'Say one true thing you would normally keep back.',
      'Ask the direct question instead of watching for the answer.',
      'Let one small slight go without filing it.',
      'Do something today with no strategic purpose at all.',
      'Tell someone you trust them, if you do.',
      'Write down what you are angry about, then either raise it or drop it. Not both.',
      'Delete the message you drafted at midnight.',
    ],
  },
  sagittarius: {
    general: [
      'You will promise something today with real sincerity and no calendar.',
      'The honest remark is going to land harder than you intend. Watch the face after you say it.',
      'Restlessness is telling you something specific. It is rarely about which country you are in.',
      'You are bored of a thing you were certain about six weeks ago. That is data, not a failing.',
      'Optimism carries you a long way and does not read contracts.',
      'Somebody wants a straight answer about whether you are staying. Give them one.',
      'You will learn something today from a source you did not plan for. Probably a stranger.',
      'Freedom you never use is an unopened option. Use one today.',
      'You will overcommit because it is easier than disappointing someone standing in front of you.',
      'A small routine would buy you more freedom than the escape you keep planning.',
    ],
    love: [
      'You are honest to the point of unkindness with people who love you and careful with strangers.',
      'The exit is always in your sightline. Someone has noticed.',
      'You want space and you also want them there when you get back. Say both parts.',
      'Making someone laugh is not the same as letting them in.',
      'Commitment has been described to you as a cage. It is a room, and you get to furnish it.',
      'Distance suits you until it does not. Check which side of that you are on.',
      'You want to be understood without being asked any questions. That is a difficult brief.',
    ],
    career: [
      'You have said yes to more than fits. Cancel one thing today rather than doing three badly.',
      'The big picture is obvious to you and invisible to everyone else. Explain it slowly, once.',
      'Detail work is not beneath you. It is the part where projects quietly die.',
      'You will pitch an idea you have not costed. Cost it first.',
      'Today favours the part of your job where you talk.',
      'A job that never changes will not hold you. Plan for that honestly rather than blowing it up later.',
      'You are good at starting and better at convincing. Somebody has to build it, so bring them in early.',
    ],
    mood: [
      'Buoyant and slightly unmanageable.',
      'Itchy for somewhere else.',
      'Philosophical about things that need a decision instead.',
      'Cheerful and blunt, with no filter to speak of.',
      'Hopeful for no particular reason, which is your normal state.',
      'Cooped up.',
      'Expansive and hard to schedule.',
      'Flat in a way that will lift the second you leave the building.',
    ],
    actionSteps: [
      'Cancel one commitment you already know you will not honour, today, while cancelling still counts as courtesy rather than a no-show.',
      'Go somewhere on foot you have never been, even ten minutes away.',
      'Before you give your honest opinion today, ask whether they want it.',
      'Put a date on it.',
      'Finish the last ten percent of something you abandoned when it stopped being new.',
      'Book something with a date on it and put money down.',
      'Say the encouraging thing you thought and did not bother to say.',
    ],
  },
  capricorn: {
    general: [
      'You will work through the break that was supposed to be a break. Again.',
      'The plan is ten years long and today is one day of it. Today is allowed to be small.',
      'Somebody younger will do badly a thing you would have prepared a year for. They may still be right.',
      'You measure the day by output. Try one other measure and see what it says.',
      'Responsibility you never agreed to has attached itself to you. Look at how that happened.',
      'Pessimism is your risk model and it is well calibrated. It is not a personality.',
      'You are further along than the version of you from five years ago could have believed. That deserves about ten minutes of your attention.',
      'Rest is not a reward for finishing, and nothing is ever finished.',
      'You will feel behind today, against a schedule you invented.',
      'Somebody assumes you are fine because you are always fine. One sentence would correct that.',
    ],
    love: [
      'You show up, pay for things and fix problems. Someone would rather you said what you feel.',
      'Reserve reads as coldness to people who do not know you well. Some of them are trying anyway, and one of them has been trying for a while.',
      'You will schedule the relationship into the gaps. There are no gaps. Move something.',
      'Duty and love overlap for you, and today it is worth checking which one is doing the work.',
      'You choose people slowly and keep them for decades.',
      'Somebody has been waiting about two years for you to be less busy.',
      'You are more romantic than your reputation, in private, for a very short list of people.',
    ],
    career: [
      'You are already trusted with more than you were hired for. Renegotiate.',
      'Working harder is your answer to every problem and it is not the answer to this one.',
      'The long game is going well and nobody, you included, has stopped to say so.',
      'A junior colleague needs an hour of your time more than the task you would do in that hour.',
      'You will take on the extra thing because you are the only one who will do it properly. That is how the last three years happened.',
      'The status you are chasing belongs to somebody whose life you would not want.',
      'The thing you want is three years out and you are behaving as though it is already late.',
    ],
    mood: [
      'Serious, and not in the mood to be jollied out of it.',
      'Grim about the timeline and getting on with it anyway.',
      'Steady and quietly tired.',
      'Ambitious in a cold, clear way.',
      'Guilty about resting, which is the tell.',
      'Dry humour, low patience for nonsense.',
      'Dutiful.',
      'Quietly proud of something you will not bring up.',
    ],
    actionSteps: [
      'Stop working at a fixed time today and do not carry it home in your head.',
      'Write down one thing you achieved this year that you have never mentioned to anyone.',
      'Delegate the task you are keeping because nobody else does it right.',
      'Spend money on something with no return.',
      'Ask for the raise or the title. Today, not next quarter.',
      'Do something badly on purpose. A meal, a drawing, anything low stakes.',
      'Take the whole lunch break.',
    ],
  },
  aquarius: {
    general: [
      'You care about people in general and find one specific person exhausting today. Both are true, and only one of them is any use to that person.',
      'You will take the opposite position out of habit. Check whether you actually hold it.',
      'Being right and being alone are not the same prize.',
      'Detachment is useful in an argument and expensive everywhere else.',
      'An idea you had two years ago is what everyone is saying now. You get no credit and you were still right.',
      'You are the strangest person in your family and it has served you well.',
      'Someone wants your feelings, not your analysis of your feelings.',
      'You are fixed in your opinions in a way that would irritate you in anyone else.',
      'You will find the group\'s consensus suspicious today. Sometimes the group is simply right.',
      'Your friends have nothing in common except you. That is an achievement.',
    ],
    love: [
      'You need more space than you are willing to ask for. Ask, before you take it badly.',
      'Emotional conversations feel like being cornered. Say that out loud rather than going quiet.',
      'You keep people at friendly distance and then wonder why nobody knows you.',
      'The unconventional arrangement works if both people actually agreed to it. Check that.',
      'You are more affected by this person than you let on, including to yourself.',
      'Consistency, rather than intensity, is what you are being asked for.',
      'You are steadier than you look. The people who stay find that out eventually.',
    ],
    career: [
      'Your idea is ahead of the room. Slow down the explanation, not the idea.',
      'You will refuse a process because it is stupid. It is stupid. Refusing it still costs you something.',
      'You work best alone and are being asked to collaborate. Name your terms at the start, out loud, rather than agreeing now and going quiet in week three.',
      'The organisation you criticise is one you could improve from inside. Less satisfying, more effective.',
      'Nobody in charge will understand this today. Write it down for later.',
      'You lose interest once the problem is solved in your head. The building part still needs you.',
      'You will be bored by the maintenance phase, and that is where the reputation gets made.',
    ],
    mood: [
      'Curious and a little removed.',
      'Contrary for no strong reason.',
      'Interested in ideas, temporarily less so in people.',
      'Independent to the point of being unreachable.',
      'Restless about something structural rather than personal.',
      'Friendly, and about six feet back.',
      'Abstracted.',
      'Sociable in theory, unavailable in practice.',
    ],
    actionSteps: [
      'Tell one person how you actually feel, without framing it as a theory.',
      'Agree with someone today where you would normally push back.',
      'Do one thing for a specific person rather than for people in general.',
      'Spend an hour alone on purpose, so you do not have to take it by force later.',
      'Write the idea down properly so it survives you losing interest.',
      'Reply to the message you have been leaving unread.',
      'Explain your idea to someone outside your subject, using no shorthand.',
    ],
  },
  pisces: {
    general: [
      'You will absorb somebody\'s mood today and carry it for hours as though it were yours.',
      'The thing you are avoiding is smaller than the fog around it. Look at it for five minutes.',
      'Vagueness protects you from being pinned down, and also from being helped.',
      'You are more capable than the story you tell about yourself.',
      'A daydream you keep returning to has a first step in it. Find the step.',
      'Somebody is taking more from you than they would take from anyone with clearer edges.',
      'Escape is available in several flavours today. Pick one you will not regret at eleven at night.',
      'You feel everything at once and then call it tiredness.',
      'You will lose two hours today and not be able to account for them.',
      'Someone else\'s crisis will arrive and you will make room for it. Check what you moved to make the room.',
    ],
    love: [
      'You fall in love with the potential in a person and then wait for them to become it.',
      'Merging with someone is not intimacy. There has to be two of you.',
      'You forgive early, often before the other person has finished doing the thing.',
      'Say what you want. Hinting has a low success rate and you have run that experiment for years.',
      'Somebody needing you is not the same as somebody loving you, and you have confused the two before.',
      'Being the one who understands everybody is lonely work.',
      'You are drawn to people who need rescuing. Notice how many of them stay in need.',
    ],
    career: [
      'The deadline is real. Write it somewhere you will see it.',
      'Your instinct about the brief is usually right and you talk yourself out of it.',
      'You undersell your work because you cannot see it clearly from inside. Ask someone else to describe it.',
      'Structure feels like a cage until you have used one. Try a schedule today and see.',
      'You will be asked to be practical. You can do it, you just do not enjoy it.',
      'A creative project you shelved is not dead. It is waiting for a Tuesday when you have the energy.',
      'Money is not vague, however much you would prefer it to be. Look at the actual balance today, not the general impression of it.',
    ],
    mood: [
      'Porous.',
      'Half here.',
      'Tender, and slightly overwhelmed by ordinary things.',
      'Dreamy, and behind on everything as a result.',
      'Quietly sad without a cause you can point at.',
      'Creative in bursts, useless between them.',
      'Soft and unfocused.',
      'Moved by something small and a bit embarrassed about it.',
    ],
    actionSteps: [
      'Do the one practical task you have been floating above for a week. Twenty minutes, and then it is done and you can stop thinking around it.',
      'Ask whose feeling this actually is.',
      'Set a timer for twenty minutes and make something without judging it.',
      'Say no to a request you would resent saying yes to.',
      'Put one thing in the calendar with a real time attached.',
      'Get outside near water if you can. It works on you, whatever the reason.',
      'Finish something you started when you were inspired and abandoned when you were not.',
    ],
  },
};

// English colors used as the base set; localized colors swap in at render time.
const baseColors = ['Gold', 'Silver', 'Crimson', 'Azure', 'Emerald', 'Violet', 'Rose', 'Amber', 'Ivory', 'Obsidian'];

/**
 * A localised pool. Either a flat array shared by all twelve signs (the
 * original shape) or, preferably, one pool per sign.
 *
 * Both are supported on purpose: a locale can be migrated to per-sign content
 * one field at a time without the others breaking, and a half-translated
 * bundle keeps working rather than falling off a cliff.
 */
type LocalizedPool = string[] | Partial<Record<ZodiacSign, string[]>>;

interface HoroscopeBundle {
  general: LocalizedPool;
  love: LocalizedPool;
  career: LocalizedPool;
  mood: LocalizedPool;
  actionSteps: LocalizedPool;
  colors: string[];
}

const HOROSCOPE_BUNDLES: Partial<Record<SupportedLocale, HoroscopeBundle>> = {
  ja: jaHoroscopes as HoroscopeBundle,
  ko: koHoroscopes as HoroscopeBundle,
  zh: zhHoroscopes as HoroscopeBundle,
};

/**
 * Pick the pool for the given field.
 *
 * English (and any locale without a bundle) reads the sign's OWN pool, so the
 * prose is specific to that sign. The ja/ko/zh bundles are still one shared
 * pool per field, which is how they have always worked — that path is
 * unchanged, and a localized reading is sign-varied only by the seed. Because
 * the English pools are now shorter and per-sign, the arrays no longer line up
 * index-for-index across locales, so a localized reading is no longer a
 * translation of the English one for the same seed.
 */
/**
 * The pool a reading is drawn from, for this field, sign and locale.
 *
 * This used to take `sign` and then discard it whenever a locale bundle
 * existed, which meant every non-English user read one sign-agnostic pool —
 * so the per-sign English rewrite reached nobody outside English, and adjacent
 * signs kept landing on the same line. It now prefers, in order:
 *
 *   1. the locale's pool FOR THIS SIGN, when the bundle is per-sign,
 *   2. the locale's flat pool, for a locale not yet migrated,
 *   3. the English per-sign pool, so a missing translation degrades to real
 *      sign-specific content rather than to nothing.
 */
function localizedTemplates(field: keyof HoroscopeTemplate, sign: ZodiacSign): string[] {
  const bundle = HOROSCOPE_BUNDLES[getLocale()];
  const localized = bundle?.[field];

  if (Array.isArray(localized)) {
    if (localized.length > 0) return localized;
  } else if (localized) {
    const perSign = localized[sign];
    if (perSign && perSign.length > 0) return perSign;
  }

  return signTemplates[sign][field];
}

function localizedColors(): string[] {
  const bundle = HOROSCOPE_BUNDLES[getLocale()];
  return bundle?.colors ?? baseColors;
}

const signTags: Record<ZodiacSign, string[]> = {
  aries: ['action', 'courage', 'initiative', 'leadership', 'energy'],
  taurus: ['stability', 'comfort', 'patience', 'sensuality', 'persistence'],
  gemini: ['communication', 'curiosity', 'adaptability', 'wit', 'versatility'],
  cancer: ['nurturing', 'intuition', 'home', 'emotion', 'protection'],
  leo: ['creativity', 'confidence', 'generosity', 'drama', 'warmth'],
  virgo: ['analysis', 'service', 'health', 'detail', 'improvement'],
  libra: ['balance', 'harmony', 'partnership', 'beauty', 'diplomacy'],
  scorpio: ['transformation', 'depth', 'passion', 'mystery', 'intensity'],
  sagittarius: ['adventure', 'optimism', 'philosophy', 'freedom', 'expansion'],
  capricorn: ['ambition', 'discipline', 'structure', 'achievement', 'responsibility'],
  aquarius: ['innovation', 'independence', 'humanity', 'originality', 'vision'],
  pisces: ['intuition', 'creativity', 'compassion', 'dreams', 'spirituality'],
};

const dayTags = [
  ['fresh-start', 'new-energy', 'momentum'],
  ['communication', 'connections', 'expression'],
  ['action', 'determination', 'courage'],
  ['wisdom', 'learning', 'expansion'],
  ['love', 'abundance', 'pleasure'],
  ['reflection', 'rest', 'boundaries'],
  ['spirituality', 'creativity', 'intuition'],
];

function seededRandom(seed: number): () => number {
  return () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
}

/**
 * Canonical zodiac order. The sign's INDEX (0-11) is folded into the
 * daily seed — the previous approach summed the first two character
 * codes of the sign name, which collided for 'cancer'/'capricorn' and
 * 'taurus'/'libra', giving those pairs byte-identical daily horoscopes.
 */
const SIGN_ORDER: ZodiacSign[] = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];

/** Deterministic per-sign, per-date seed: same sign + same date → same content. */
function horoscopeSeed(sign: ZodiacSign, date: string): number {
  // The sign has to actually change the draw.
  //
  // The old seed was `dateNum * 13 + signIndex * 101`. Against a millisecond
  // epoch, signIndex * 101 moved the first draw by ~2.7% of the RNG range —
  // so the twelve signs formed a monotone ramp rather than twelve independent
  // streams, and adjacent signs kept landing on the same line. Measured on the
  // localised pools, 11 of 36 sign/date cells produced a line identical to
  // another sign's.
  //
  // Hashing the sign in multiplicatively, on a DAY number rather than
  // milliseconds, gives each sign its own stream while keeping the whole thing
  // deterministic: same sign + same date is still the same reading.
  const dayNum = Math.floor(new Date(date).getTime() / 86400000);
  const signIndex = SIGN_ORDER.indexOf(sign);
  return ((dayNum * 2654435761 + (signIndex + 1) * 40503) >>> 0) % 2147483647;
}

export function generateDailyHoroscope(sign: ZodiacSign, date: string): {
  general: string;
  love: string;
  career: string;
  energy: number;
  luckyNumber: number;
  luckyColor: string;
} {
  const random = seededRandom(horoscopeSeed(sign, date));

  const colors = localizedColors();
  const general = localizedTemplates('general', sign);
  const love = localizedTemplates('love', sign);
  const career = localizedTemplates('career', sign);

  return {
    general: general[Math.floor(random() * general.length)],
    love: love[Math.floor(random() * love.length)],
    career: career[Math.floor(random() * career.length)],
    energy: Math.floor(random() * 5) + 1,
    luckyNumber: Math.floor(random() * 99) + 1,
    luckyColor: colors[Math.floor(random() * colors.length)],
  };
}

export function generateEnhancedHoroscope(sign: ZodiacSign, date: string): EnhancedHoroscope {
  const random = seededRandom(horoscopeSeed(sign, date));

  const colors = localizedColors();
  const dayOfWeek = new Date(date).getDay();

  const signTagSet = signTags[sign];
  const dayTagSet = dayTags[dayOfWeek];
  const selectedSignTags = signTagSet.slice(0, 2 + Math.floor(random() * 2));
  const selectedDayTags = dayTagSet.slice(0, 1 + Math.floor(random() * 2));

  const general = localizedTemplates('general', sign);
  const love = localizedTemplates('love', sign);
  const career = localizedTemplates('career', sign);
  const mood = localizedTemplates('mood', sign);
  const actionSteps = localizedTemplates('actionSteps', sign);

  return {
    sign,
    date,
    general: general[Math.floor(random() * general.length)],
    love: love[Math.floor(random() * love.length)],
    career: career[Math.floor(random() * career.length)],
    mood: mood[Math.floor(random() * mood.length)],
    energy: Math.floor(random() * 5) + 1,
    luckyNumber: Math.floor(random() * 99) + 1,
    luckyColor: colors[Math.floor(random() * colors.length)],
    actionStep: actionSteps[Math.floor(random() * actionSteps.length)],
    tags: [...selectedSignTags, ...selectedDayTags],
  };
}

export const dailyPrompts = [
  'What intention do you want to set for today?',
  'What are you most grateful for right now?',
  'What fear are you ready to release?',
  'Describe a moment that brought you joy recently.',
  'What lesson has life been teaching you lately?',
  'If you could tell your past self one thing, what would it be?',
  'What does your ideal day look like?',
  'What boundary do you need to strengthen?',
  'Who in your life deserves more appreciation?',
  'What dream have you been postponing?',
  'How can you show yourself more compassion today?',
  'What pattern in your life are you ready to change?',
];

export const goalBasedPrompts: Record<string, string[]> = {
  love: [
    'What qualities do you most value in relationships?',
    'How can you show more love to yourself today?',
    'What does healthy love look like to you?',
    'What past relationship lesson are you grateful for?',
  ],
  career: [
    'What does success mean to you beyond money?',
    'What skill do you want to develop next?',
    'Where do you see yourself professionally in one year?',
    'What would you do if you knew you couldn\'t fail?',
  ],
  confidence: [
    'What accomplishment are you most proud of?',
    'What would you do if you fully believed in yourself?',
    'What negative self-talk pattern can you release today?',
    'Name three things you genuinely like about yourself.',
  ],
  healing: [
    'What emotion needs your attention right now?',
    'What wound from the past is ready to heal?',
    'How can you create more peace in your daily life?',
    'What do you need to forgive yourself for?',
  ],
  focus: [
    'What is the single most important thing you can do today?',
    'What distractions are keeping you from your goals?',
    'How can you create more space for deep work?',
    'What would you focus on if you had unlimited time?',
  ],
  purpose: [
    'What makes you lose track of time?',
    'How do you want to be remembered?',
    'What problem in the world do you most want to solve?',
    'What gifts do you have to offer the world?',
  ],
  stress: [
    'What is one thing you can let go of today?',
    'How does your body tell you it\'s stressed?',
    'What small act of self-care can you do right now?',
    'What worry can you release because it\'s out of your control?',
  ],
};

function localizedDailyPrompts(): string[] {
  const bundle = HOROSCOPE_BUNDLES[getLocale()] as (HoroscopeBundle & { dailyPrompts?: string[] }) | undefined;
  return bundle?.dailyPrompts ?? dailyPrompts;
}

function localizedGoalPrompts(goal: string): string[] | undefined {
  const bundle = HOROSCOPE_BUNDLES[getLocale()] as (HoroscopeBundle & { goalBasedPrompts?: Record<string, string[]> }) | undefined;
  return bundle?.goalBasedPrompts?.[goal] ?? goalBasedPrompts[goal];
}

export function getDailyPrompt(date: string): string {
  const dateNum = new Date(date).getTime();
  const random = seededRandom(dateNum);
  const prompts = localizedDailyPrompts();
  return prompts[Math.floor(random() * prompts.length)];
}

export function getPersonalizedPrompt(date: string, goals: string[]): string {
  const dateNum = new Date(date).getTime();
  const random = seededRandom(dateNum);

  if (goals.length > 0) {
    const primaryGoal = goals[Math.floor(random() * goals.length)];
    const prompts = localizedGoalPrompts(primaryGoal);
    if (prompts && prompts.length > 0) {
      return prompts[Math.floor(random() * prompts.length)];
    }
  }

  const prompts = localizedDailyPrompts();
  return prompts[Math.floor(random() * prompts.length)];
}

export function getHoroscopeTags(sign: ZodiacSign): string[] {
  return signTags[sign] || [];
}

const planetaryTransits = [
  'Mercury enhances communication - express yourself clearly',
  'Venus brings harmony to relationships - open your heart',
  'Mars energizes your ambitions - take decisive action',
  'Jupiter expands opportunities - think big',
  'Saturn teaches valuable lessons - embrace discipline',
  'Uranus sparks innovation - welcome the unexpected',
  'Neptune heightens intuition - trust your inner voice',
  'Pluto transforms deeply - let go of what no longer serves',
  'The Moon affects emotions - honor your feelings',
  'The Sun illuminates your path - step into your power',
];

const affirmationsBySign: Record<ZodiacSign, string[]> = {
  aries: [
    'I embrace my courage and take bold action',
    'My passion ignites positive change in my life',
    'I am a natural leader and pioneer',
    'I trust my instincts and act with confidence',
    'My courage creates paths where none existed',
    'I channel my fire with purpose and precision',
    'My directness is a gift I offer the world',
    'I lead not because I need to, but because I can',
    'My passion is fuel, not fire I cannot control',
    'I am allowed to rest without losing my edge',
  ],
  taurus: [
    'I am grounded, stable, and secure',
    'I attract abundance in all forms',
    'I trust the natural rhythm of my life',
    'I create lasting beauty and comfort',
    'My patience creates what urgency cannot',
    'I deserve the beauty and comfort I create',
    'Change does not threaten me—it reveals new ground',
    'My devotion is rare and irreplaceable',
    'I release my grip on what needs to leave',
    'My steadiness is a form of quiet power',
  ],
  gemini: [
    'I communicate my truth with clarity and grace',
    'My curiosity opens doors to endless possibilities',
    'I adapt easily to new situations',
    'My mind is sharp and my words inspire',
    'My versatility is a strength, not instability',
    'I can go deep without losing my lightness',
    'My questions lead to truths others overlook',
    'I honor both sides of myself without conflict',
    'My words carry weight and wisdom today',
    'I choose focus without sacrificing freedom',
  ],
  cancer: [
    'I honor my emotions and intuition',
    'I create a safe, nurturing space for myself and others',
    'My sensitivity is my greatest strength',
    'I trust the wisdom of my heart',
    'My emotions are information, not obstacles',
    'I protect my energy as fiercely as I protect others',
    'My boundaries strengthen my capacity to love',
    'I am safe enough to feel everything fully',
    'My intuition has never led me astray',
    'I give from overflow, not from depletion',
  ],
  leo: [
    'I shine brightly and share my gifts generously',
    'I am confident, creative, and courageous',
    'I lead with my heart and inspire others',
    'My authentic self is magnificent',
    'I do not need applause to know my worth',
    'My generosity inspires generosity in return',
    'I am magnificent even in my quiet moments',
    'My light does not diminish when others shine',
    'I lead with my heart, not my need to be seen',
    'My confidence grows from self-knowledge, not external validation',
  ],
  virgo: [
    'I am organized, efficient, and purposeful',
    'I serve others while honoring myself',
    'My attention to detail creates excellence',
    'I am worthy of the care I give to others',
    'My imperfection does not reduce my value',
    'I am allowed to receive without earning it first',
    'My analysis serves me when I use it gently',
    'I release the need to fix what is not broken',
    'My care for others begins with care for myself',
    'Excellence is my nature—perfectionism is not',
  ],
  libra: [
    'I create harmony and balance in my life',
    'I attract loving, supportive relationships',
    'My fairness and grace inspire others',
    'I make decisions that honor all parts of myself',
    'My truth matters as much as the peace I keep',
    'I make decisions that honor my own needs',
    'My boundaries create better relationships, not weaker ones',
    'I am enough without anyone else\'s approval',
    'My sense of justice extends to how I treat myself',
    'I choose honesty over harmony when honesty heals',
  ],
  scorpio: [
    'I embrace transformation and emerge stronger',
    'I trust the intensity of my emotions',
    'I release what no longer serves my highest good',
    'My depth and passion are powerful gifts',
    'My intensity is a gift, not a burden',
    'I let go without needing to understand everything first',
    'My vulnerability is my most powerful weapon',
    'I trust without requiring proof at every turn',
    'My past has made me perceptive, not paranoid',
    'I transform pain into purpose with every breath',
  ],
  sagittarius: [
    'I am free to explore and expand my horizons',
    'I trust my journey and embrace adventure',
    'My optimism attracts positive experiences',
    'I am a seeker of truth and wisdom',
    'My restlessness leads me to where I need to be',
    'I honor my commitments without losing my freedom',
    'My optimism is earned through experience, not naivety',
    'I find depth in stillness, not just in motion',
    'My truth-telling is a gift when delivered with care',
    'I am free to stay as I am to go',
  ],
  capricorn: [
    'I achieve my goals through dedication and persistence',
    'I am building a legacy of lasting value',
    'My discipline leads to remarkable success',
    'I balance ambition with self-compassion',
    'I am more than what I produce',
    'My worth exists before my achievements',
    'I rest without guilt and rise without proving myself',
    'My emotional life matters as much as my professional life',
    'I build with love, not just ambition',
    'My discipline serves my joy, not just my goals',
  ],
  aquarius: [
    'I embrace my unique vision and innovative spirit',
    'I contribute meaningfully to the world around me',
    'My independence strengthens my connections',
    'I am a catalyst for positive change',
    'My emotions are real even when they feel inconvenient',
    'I connect deeply without losing my independence',
    'My vision inspires because I live it, not just speak it',
    'I belong without needing to conform',
    'My vulnerability does not compromise my strength',
    'I let people in without losing myself',
  ],
  pisces: [
    'I trust my intuition and creative imagination',
    'I am deeply connected to the universal flow',
    'My compassion heals myself and others',
    'I honor my sensitivity as a divine gift',
    'My boundaries protect my gifts, not limit them',
    'I am not responsible for absorbing everyone\'s pain',
    'My sensitivity is intelligence in another form',
    'I ground my dreams in action, one step at a time',
    'My inner world is rich and worthy of trust',
    'I choose clarity without losing compassion',
  ],
};

function localeBundle(): { planetaryTransits?: string[]; affirmationsBySign?: Record<ZodiacSign, string[]> } | null {
  const locale = getLocale();
  if (locale === 'ja') return jaHoroscopes as unknown as Record<string, unknown>;
  if (locale === 'ko') return koHoroscopes as unknown as Record<string, unknown>;
  if (locale === 'zh') return zhHoroscopes as unknown as Record<string, unknown>;
  return null;
}

export function getPlanetaryTransit(date: string): string {
  const dateNum = new Date(date).getTime();
  const random = seededRandom(dateNum);
  const locBundle = localeBundle();
  const list = (locBundle && Array.isArray(locBundle.planetaryTransits) && locBundle.planetaryTransits.length > 0)
    ? locBundle.planetaryTransits
    : planetaryTransits;
  return list[Math.floor(random() * list.length)];
}

export function getDailyAffirmation(sign: ZodiacSign, date: string): string {
  const dateNum = new Date(date).getTime();
  const random = seededRandom(dateNum);
  const locBundle = localeBundle();
  const signList = locBundle?.affirmationsBySign?.[sign];
  const list = Array.isArray(signList) && signList.length > 0
    ? signList
    : affirmationsBySign[sign];
  return list[Math.floor(random() * list.length)];
}

export function getLuckyNumbers(date: string, count: number = 6): number[] {
  const dateNum = new Date(date).getTime();
  const random = seededRandom(dateNum);
  const numbers: number[] = [];

  while (numbers.length < count) {
    const num = Math.floor(random() * 49) + 1;
    if (!numbers.includes(num)) {
      numbers.push(num);
    }
  }

  return numbers.sort((a, b) => a - b);
}

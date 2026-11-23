---
status: approved
---

# Design brief: Takar (working title, default)

<!-- Filled in by plan-lens from the learner's interview. Use the learner's words. Mark any value they didn't choose as (default). -->
<!-- The interview was held in Indonesian. The learner's answers are translated here; the original words are kept in quotes where the wording matters. -->

## The one spatial moment
Every morning I boil water and make my coffee by hand (ground coffee in the glass, hot water on top, stir). The Lens is at its best while I pour: the glass shows a column of numbers from the bottom to the top, like a measuring glass, and the coffee gets lighter in colour as the water rises. "When the water touches the amount I usually use, my hand stops by reflex."

## Why it belongs on glasses
- Uses: draws in the world (the scale sits on the glass itself) and leaves your body free (both hands stay on the kettle and the glass, eyes stay on the pour).
- Why it's better than the phone or laptop version: while pouring hot water I cannot hold or look at a phone. The amount has to be readable exactly where I am already looking, on the glass.

## Product or overlay
- Type: overlay. It responds to a real glass and real water.
- What the real version would sense: where the glass is, and how high the liquid is inside it.
- Stand-in for the preview: nothing real is recognised. The Lens provides a virtual table with a virtual stove, kettle and 300 ml glass. The water level is driven by the pour interaction below, not by sensing. Keep this obvious in the scene.

## Where things live
- Where the user is looking during the main task: down and slightly right, at the glass on the table.
- Table with stove: in front of the user, about 55 cm away (default), top at about 90 cm from the floor (default). The table has four legs and stands on the floor (asked for by the learner after trying the first build: "make the table have legs").
- Kettle: on the stove, directly in front of the user. Real kettle size, about 18 cm tall (default).
- Glass: on the table to the user's right ("the glass is on the table to my right"), about 30 cm right of the kettle (default). Holds 300 ml: about 12 cm tall and 7.5 cm across (default). Ground coffee is already in the bottom of the glass (default; in real life it is measured while the water boils).
- Millilitre scale: on the front of the glass, the side facing the user ("the numbers are on the front of the glass"). Numbers run in a column from the bottom to the top. Marks every 50 ml, from 50 to 300 (default). Light-coloured text, large enough to read from where the user stands.
- Coffee in the glass: the liquid rises as water is added, and its colour goes from dark brown to a lighter brown as the amount increases ("when it has just been poured it is dark brown, and as more water is added the colour fades").

- Demo placement (chosen by the learner while testing): the preview room is Lens Studio's built-in "Colorful Home". In the middle of the room the table "blocked the walkway", so the whole stand-in stands against a bare wall, like a kitchen side table, about 3 m from the start position. The user walks up to it. On real glasses the stand-in would not exist; the scale would sit on the user's own glass.
- Kettle at rest: its body sits exactly in the middle of the burner (asked for by the learner: "I want the kettle to sit in the middle of the stove").

## Hands and input
- Move the kettle: pinch the kettle on the stove and drag it to the right until it is over the glass.
- Pour: with the kettle over the glass, keep the pinch and drag upward. Water flows from the kettle into the glass and the level rises. Pouring only works when the kettle is positioned over the glass ("the position has to be right at the glass").
- Stop: release the pinch. The water stops at once.
- After release the kettle waits level over the glass for 3 seconds (the same pause as the scale), then glides back to the stove by itself and sits upright (changed by the learner after watching the first build: the kettle left hanging beside the glass looked untidy).
- Add more: within those 3 seconds, pinch the kettle again and drag upward again; after it has returned, bring it over from the stove again. The level continues from where it was. There is no fixed target. The user decides each time ("sometimes more water, sometimes less, so the taste is different"; for example, stopping at 200 ml in the 300 ml glass).
- Pouring stops by itself at 300 ml so the glass never overflows (default).
- When the kettle is released away from the glass, it returns to the stove (default). Back on the stove it always stands level, never tilted (asked for by the learner after trying the first build).
- Targets are big and highlight when aimed at.
- Voice (if any) and the button that does the same job: none.
- A single large "Start over" button beside the stove empties the glass and puts the kettle back, so the pour can be repeated (default; added for the demo).

## When things show
- Millilitre scale: shows when the kettle has been dragged over the glass, ready to pour. Hides after pouring is finished, but not at once: it stays for a pause of 3 seconds (default length) after the pinch is released, then fades ("give it a pause, don't make it vanish straight away"). If pouring starts again during the pause, it stays.
- Coffee colour: always visible in the glass once there is liquid in it.
- Pouring sound while water flows (default).
- If something needs attention out of view: none. Everything happens at the glass.

## Done criteria
Each one can be checked in Lens Studio's preview.
1. Pinching the kettle on the stove and dragging it right moves it over the glass, and the millilitre scale appears on the front of the glass.
2. With the kettle over the glass, dragging upward makes water flow and the level in the glass rise against the scale.
3. As the level rises, the coffee changes from dark brown to a lighter brown.
4. Releasing the pinch stops the water. The scale stays visible for about 3 seconds, so the amount can be checked, then fades.
5. "After pouring I look at whether the amount is right, and if it isn't, I add more": pinching the kettle again and dragging upward continues from the current level, for example from 150 ml up to 200 ml.

## Out of scope
- Recognising a real glass, a real kettle or real water.
- Measuring the coffee powder, boiling the water, and stirring.
- Saving a preferred amount between sessions.
- Voice.

## Risks and open questions
- Feel unproven: on real glasses the level would have to be sensed from a real glass, and real hands holding a real kettle would replace the pinch-and-drag. Only the logic can be shown in the preview.
- The view of SPECS is narrow (about 37° tall by 32° wide). A kettle held above a glass at arm's length may not fit in view together with the scale. The scale and the liquid matter most and must stay in view; the kettle may be partly cut off.
- Pinch-drag does two jobs (moving the kettle, then pouring by dragging up). The build must make the switch between them clear, for example by snapping the kettle into a pouring spot over the glass.
- The lens name is a working title the learner has not chosen yet.

## Build notes for CLAD
- Build for SPECS so it runs and can be demonstrated in Lens Studio's preview. No SPECS device is available.
- Use Spectacles Interaction Kit (SIK) and UI Kit for all interactions, so they work with the mouse in Interactive Preview and with LEAF.
- Build any stand-in exactly as described above, and keep it obvious in the scene.
- Use real-world scale in centimeters. Keep content inside the user's view during the main task.
- The display is additive: black renders as transparent. Don't rely on black or very dark content to be seen; keep text light and readable from where the user stands.
- Get the basic flow working first, then add detail.
- Write LEAF scenarios for each done criterion, run them in preview, and report which pass. Say which criteria have no test.
- Don't record, identify, or follow people.

## After the build: judge it
This part is for you, after CLAD finishes.

1. **Does it work?** Ask your agent which LEAF tests passed and which done criteria have no test.
2. **Walk around it.** Open the preview in Interactive Preview. Use WASD to move, Q and E to go down and up, and right-drag (or hold Shift) to look around. Clicking acts as a pinch. Stand where a user would and look at the task.
3. **Ask the three questions.**
   - Does it use what I'm looking at?
   - Does it put something in my space, where it belongs?
   - Does it free my hands or let me keep my eyes up?
   - Would it be just as good on a phone? If so, what would make it need the glasses?
4. **Check comfort.**
   - Everything I need is in view while I do the task. Nothing sits at the edges, behind me, or stuck to my face.
   - Every control is within reach of someone standing there.
   - Text reads easily from where I stand. No dark UI disappearing.
   - Things show when needed and get out of the way.
5. **Label what you know.** Write "logic proven" next to anything the tests and preview show working, and "feel unproven" next to anything only real glasses could tell you (comfort over time, real hand tracking, real recognition).
6. **Fix with design notes, not code.** Tell your agent what to change in design terms, for example: "Move the step card 15 cm lower and next to the pan. Make the Next button twice as big. Re-run the tests." If a fix takes under a minute, like nudging a panel, do it yourself in the scene.
7. **Submit.** Record a video under 3 minutes of your Lens in the preview, public on YouTube. Make your repo public with your Lens Studio project and this `devpost/` folder. Details are on the hackathon site: https://learn-specs.devpost.com/resources

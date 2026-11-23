# Pour Line

A Lens for SPECS that puts a measuring scale on your glass while you pour.

Made for the Learn AR with SPECS hackathon. "Takar" (Indonesian for "measure") was the working title, so files
and scene objects in the project still carry that name.

## The idea

Every morning I boil water and make coffee by hand: ground coffee in the glass, hot water on top, stir. I never
measure the water. I pour, watch the colour, and stop when it looks right.

While pouring hot water you cannot hold a phone or look away. So the information has to be where the eyes
already are: on the glass.

- A column of numbers from 50 to 300 ml runs up the front of the glass, like a measuring glass.
- The coffee gets lighter as water is added, from dark brown to a lighter brown.
- There is no fixed target. Some days I want 200 ml, some days more. The Lens shows the amount and I decide.

## What happens in the Lens

1. Pinch the kettle on the stove and drag it toward the glass. It snaps into place over the glass and the
   millilitre scale appears.
2. Keep the pinch and drag upward. The kettle tilts and water flows at 30 ml per second.
3. Release. The water stops at once. The kettle waits level over the glass for 3 seconds and the scale stays
   visible, so the amount can be checked.
4. Not enough? Pinch the kettle again within those 3 seconds and drag upward. Pouring continues from the
   current level.
5. Otherwise the kettle glides back to the middle of the burner and the scale fades.
6. The glass stops filling at 300 ml. "Start over" empties it.

## What is real and what is a stand-in

Nobody on this project has SPECS glasses. Everything was built and tested in the Lens Studio preview.

On real glasses the Lens would have to find a real glass and sense the level of the liquid in it. The preview
cannot recognise real things, so the Lens provides its own table, stove, kettle and 300 ml glass, and the level
is driven by the pour interaction. A caption on the table says so. The part after the sensing is built for
real: the scale, the colour, when things appear and when they get out of the way.

## Run it

1. Install Lens Studio 5.25 or later.
2. Open `specs-lens.esproj`.
3. In the Preview panel choose the **Colorful Home** environment (Interactive, SPECS 27). The table stands
   against a green wall about 3 m from the start position, around a corner. From the start, roughly:
   turn left 45°, press D for 40 cm, W for 3 m, A for 1.25 m, then turn around to face the green wall and
   look down.
4. Click acts as a pinch. Click the kettle, hold, drag right, then up.

In another environment the Lens still runs, but the table will not line up with a wall or the floor.

## How it was made

- **Design:** the `plan-lens` skill from the hackathon interviewed me and wrote
  [devpost/design-brief.md](devpost/design-brief.md). Decisions I made later, after trying each build, are
  recorded there too: legs on the table, the kettle returning to the stove by itself, the kettle centred on the
  burner, the table against a wall, the gas cylinder and hose, and the name.
- **Build:** Claude Code with Snap's CLAD plugin and the Lens Studio MCP server built the Lens from the brief.
  CLAD's build ran as separate steps: plan, project setup, sounds, icon, meshes, UI, scripts, scene assembly,
  audits.
- **Models:** I was not signed in to Lens Studio, so no AI model generation was available. Every model
  (table, stove, kettle, glass, liquid, water stream, scale ticks, gas cylinder, hose) is geometry written in
  TypeScript with MeshBuilder. That turned out to suit this Lens: the liquid, the stream and the ticks have to
  change shape or fade while the Lens runs.
- **Sounds:** four short sounds generated locally by code. No samples.

### Things that went wrong on the way

- The first build could not be pinched at all. A direct pinch landed at the kettle's origin, deep inside its
  grab box, where the fingertip test reports nothing. A small extra collider at that point fixed it.
- The planned pouring position put the spout 4.35 cm from the centre of a glass with a 3.5 cm inner radius.
  The position is now computed from the real spout.
- The kettle model's origin was the centre of its full width including the spout, so the body sat 3 cm off
  the burner.
- In Colorful Home the floor is 24 cm higher than the build assumed. The table legs were sinking into it.

## Tests

Six LEAF scenarios are in `Assets/LeafTests`. They drive the kettle with LEAF's hand and check the state of
the Lens through a read-only API on `TakarMain`. Each ran twice in the Lens Studio preview; all 12 runs passed.

| Done criterion from the brief | Result | Observed |
| --- | --- | --- |
| 1. Dragging the kettle over the glass shows the scale | Pass | Snaps in 0.37 s, scale fully visible |
| 2. Dragging up pours and the level rises | Pass | 30.00 ml/s; height matches ml / 300 × 11 cm |
| 3. The coffee goes from dark to lighter brown | Pass | Brightness 0.70 at 5 ml, 1.06 at 110 ml |
| 4. Release stops the water; scale holds about 3 s, then fades | Pass | Level unchanged; fade starts at 3.05 s |
| 5. Adding more continues from the current level | Pass | 0 → 72 → 157 → 244 ml, by both paths |
| Extra: Start over resets | Pass | 58 ml → 0, kettle home |

The scenarios check values inside the Lens, not rendered pixels. Looks were checked by eye in the preview.

## Not proven

- Feel on real glasses: real hand tracking, comfort, and whether the scale stays readable on a real glass.
- Sensing a real glass and a real liquid level. Not attempted.
- The sounds have been generated and wired but were only checked as files.
- Seen from above, the liquid surface looks slightly higher than the number beside it, as on a real measuring
  glass.

## Project layout

```
Assets/Scripts/Takar*.ts      state, kettle interaction, glass view, sound, UI
Assets/Scripts/*Mesh.ts       code-authored models (MeshKit.ts, MeshShapes.ts are shared)
Assets/LeafTests/             LEAF scenarios
Assets/GeneratedSFX/          generated sounds
devpost/design-brief.md       the design brief
agent/skills/plan-lens/       the hackathon's planning skill
Packages/                     Lens Studio packages (InteractionKit, UIKit, LEAF, preview helpers)
```

`Packages/AiPreviewAgent*.lspkg`, `Packages/Bitmoji 3D.lsc` and the scene object "AiPreviewAgent Handler" were
added by the Lens Studio MCP tools so the coding agent could inspect and drive the preview. They are not part
of the Lens's design.

## Licence

MIT for the code and assets written for this project. See [LICENSE](LICENSE). The Lens Studio packages in
`Packages/` belong to Snap and keep their own terms.

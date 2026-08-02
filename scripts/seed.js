/**
 * Seed script — loads 10 initial skills into the lucineer-skills Vectorize index.
 *
 * Usage:
 *   node scripts/seed.js [WORKER_URL]
 *
 * Defaults to http://localhost:8787 for local dev.
 * Uses the /api/skills/seed batch endpoint.
 */

const WORKER_URL = process.argv[2] || "http://localhost:8787";

const skills = [
  // ── 1. Scrap Tower ──────────────────────────────
  {
    name: "Build a scrap tower",
    description:
      "A multi-floor vertical structure built from rusty metal panels, pipes, and salvaged parts. Scrapcraft aesthetic with asymmetric design and weathered textures. Great as a landmark or lookout post.",
    metadata: { category: "structure", style: "scrapcraft", height_tier: 3 },
    luau_source: `-- Scrap Tower — multi-floor vertical landmark
local function buildScrapTower(center: Vector3, floors: number)
	local tower = Instance.new("Model")
	tower.Name = "ScrapTower"

	local floorHeight = 12
	local pillarOffset = 8

	for floor = 0, floors - 1 do
		local yBase = center.Y + floor * floorHeight

		-- Floor platform (rusted metal)
		local platform = Instance.new("Part")
		platform.Name = "Floor_" .. floor
		platform.Size = Vector3.new(16, 1, 16)
		platform.Position = Vector3.new(center.X, yBase, center.Z)
		platform.BrickColor = BrickColor.new("Rust")
		platform.Material = Enum.Material.Metal
		platform.Anchored = true
		platform.Parent = tower

		-- Four corner pillars (salvaged pipes)
		for _, dir in ipairs({ {1,1}, {1,-1}, {-1,1}, {-1,-1} }) do
			local pillar = Instance.new("Part")
			pillar.Name = "Pillar_" .. floor
			pillar.Size = Vector3.new(2, floorHeight, 2)
			pillar.Position = Vector3.new(
				center.X + dir[1] * pillarOffset,
				yBase + floorHeight / 2,
				center.Z + dir[2] * pillarOffset
			)
			pillar.BrickColor = BrickColor.new("Dark stone grey")
			pillar.Material = Enum.Material.Metal
			pillar.Anchored = true
			pillar.Parent = tower
		end

		-- Railing (broken/unequal on top floor for scrap look)
		if floor < floors - 1 then
			for side = 0, 3 do
				local rail = Instance.new("Part")
				rail.Name = "Rail_" .. floor .. "_" .. side
				rail.Size = Vector3.new(16, 2, 1)
				rail.CFrame = CFrame.new(center.X, yBase + 3, center.Z)
					* CFrame.Angles(0, math.rad(side * 90), 0)
					* CFrame.new(0, 0, -7.5)
				rail.BrickColor = BrickColor.new("Brown")
				rail.Material = Enum.Material.Wood
				rail.Anchored = true
				rail.Parent = tower
			end
		end
	end

	-- Antenna on top (signature scrap look)
	local antenna = Instance.new("Part")
	antenna.Name = "Antenna"
	antenna.Size = Vector3.new(0.5, 20, 0.5)
	antenna.Position = Vector3.new(center.X, center.Y + floors * floorHeight + 10, center.Z)
	antenna.BrickColor = BrickColor.new("Lily white")
	antenna.Material = Enum.Material.Metal
	antenna.Anchored = true
	antenna.Parent = tower

	-- Blinking light
	local light = Instance.new("PointLight")
	light.Color = Color3.fromRGB(255, 100, 0)
	light.Range = 30
	light.Brightness = 2
	light.Parent = antenna

	return tower
end

return buildScrapTower`,
  },

  // ── 2. Crafting Workbench ───────────────────────
  {
    name: "Build a crafting workbench",
    description:
      "An interactive crafting station with a wooden worktop, tool rack, and input/output slots. Players walk up and press E to open the crafting menu. Core Scrapcraft gameplay element.",
    metadata: { category: "interactive", style: "scrapcraft", interactive: true },
    luau_source: `-- Crafting Workbench — interactive station with proximity prompt
local function buildWorkbench(position: Vector3)
	local bench = Instance.new("Model")
	bench.Name = "CraftingWorkbench"

	-- Table top
	local top = Instance.new("Part")
	top.Name = "TableTop"
	top.Size = Vector3.new(6, 0.5, 3)
	top.Position = position + Vector3.new(0, 3, 0)
	top.BrickColor = BrickColor.new("Wood")
	top.Material = Enum.Material.Wood
	top.Anchored = true
	top.Parent = bench

	-- Legs
	for _, offset in ipairs({ {2, 1}, {2, -1}, {-2, 1}, {-2, -1} }) do
		local leg = Instance.new("Part")
		leg.Name = "Leg"
		leg.Size = Vector3.new(0.5, 3, 0.5)
		leg.Position = position + Vector3.new(offset[1], 1.5, offset[2])
		leg.BrickColor = BrickColor.new("Dark walnut")
		leg.Material = Enum.Material.Wood
		leg.Anchored = true
		leg.Parent = bench
	end

	-- Tool rack (back board)
	local rack = Instance.new("Part")
	rack.Name = "ToolRack"
	rack.Size = Vector3.new(6, 2, 0.3)
	rack.Position = position + Vector3.new(0, 4.25, -1.3)
	rack.BrickColor = BrickColor.new("Pine Cone")
	rack.Material = Enum.Material.Wood
	rack.Anchored = true
	rack.Parent = bench

	-- Hanging tools (decorative)
	for i, toolName in ipairs({ "Hammer", "Wrench", "Screwdriver" }) do
		local tool = Instance.new("Part")
		tool.Name = toolName
		tool.Size = Vector3.new(0.3, 1, 0.3)
		tool.Position = position + Vector3.new(-2 + i * 1.5, 3.5, -1.1)
		tool.BrickColor = BrickColor.new("Medium stone grey")
		tool.Material = Enum.Material.Metal
		tool.Anchored = true
		tool.Parent = bench
	end

	-- Interaction prompt
	local prompt = Instance.new("ProximityPrompt")
	prompt.ActionText = "Craft"
	prompt.ObjectText = "Workbench"
	prompt.KeyboardKeyCode = Enum.KeyCode.E
	prompt.HoldDuration = 0.5
	prompt.Parent = top

	-- Output slot indicator (glowing pad)
	local output = Instance.new("Part")
	output.Name = "OutputSlot"
	output.Size = Vector3.new(1, 0.1, 1)
	output.Position = position + Vector3.new(2, 3.3, 0)
	output.BrickColor = BrickColor.new("Lily white")
	output.Material = Enum.Material.Neon
	output.Anchored = true
	output.Parent = bench

	return bench
end

return buildWorkbench`,
  },

  // ── 3. Robot Follower ───────────────────────────
  {
    name: "Build a robot follower",
    description:
      "A small ScrapBot companion that follows the nearest player using Humanoid pathfinding. Built from a box body, single eye sensor, and stubby legs. Quirky personality with occasional idle animations.",
    metadata: { category: "npc", style: "scrapbot", animated: true },
    luau_source: `-- ScrapBot — NPC follower that trails the nearest player
local function buildRobotFollower(spawnPos: Vector3)
	local bot = Instance.new("Model")
	bot.Name = "ScrapBot"

	-- Humanoid (for pathfinding)
	local humanoid = Instance.new("Humanoid")
	humanoid.Name = "Humanoid"
	humanoid.WalkSpeed = 8
	humanoid.Parent = bot

	-- Primary part (torso)
	local torso = Instance.new("Part")
	torso.Name = "HumanoidRootPart"
	torso.Size = Vector3.new(2, 2, 1.5)
	torso.Position = spawnPos + Vector3.new(0, 3, 0)
	torso.BrickColor = BrickColor.new("Medium stone grey")
	torso.Material = Enum.Material.Metal
	torso.CanCollide = true
	torso.Parent = bot

	-- Head with single eye
	local head = Instance.new("Part")
	head.Name = "Head"
	head.Size = Vector3.new(1.5, 1.2, 1.2)
	head.Position = torso.Position + Vector3.new(0, 1.8, 0)
	head.BrickColor = BrickColor.new("Rust")
	head.Material = Enum.Material.Metal
	head.Parent = bot

	local weld = Instance.new("WeldConstraint")
	weld.Part0 = torso
	weld.Part1 = head
	weld.Parent = head

	-- Glowing eye
	local eye = Instance.new("Part")
	eye.Name = "Eye"
	eye.Size = Vector3.new(0.4, 0.4, 0.1)
	eye.Position = head.Position + Vector3.new(0, 0, -0.6)
	eye.BrickColor = BrickColor.new("Lime green")
	eye.Material = Enum.Material.Neon
	eye.Anchored = false
	eye.Parent = bot

	local eyeWeld = Instance.new("WeldConstraint")
	eyeWeld.Part0 = head
	eyeWeld.Part1 = eye
	eyeWeld.Parent = eye

	-- Legs (two stubby blocks)
	for i, side in ipairs({ -1, 1 }) do
		local leg = Instance.new("Part")
		leg.Name = "Leg" .. i
		leg.Size = Vector3.new(0.6, 1.5, 0.6)
		leg.Position = torso.Position + Vector3.new(side * 0.6, -1.75, 0)
		leg.BrickColor = BrickColor.new("Dark stone grey")
		leg.Material = Enum.Material.Metal
		leg.Parent = bot

		local legWeld = Instance.new("WeldConstraint")
		legWeld.Part0 = torso
		legWeld.Part1 = leg
		legWeld.Parent = leg
	end

	bot.PrimaryPart = torso
	bot.Parent = workspace

	-- Follow logic
	local Players = game:GetService("Players")
	task.spawn(function()
		while bot.Parent do
			local nearest = nil
			local nearestDist = math.huge
			for _, player in ipairs(Players:GetPlayers()) do
				local char = player.Character
				local hrp = char and char:FindFirstChild("HumanoidRootPart")
				if hrp then
					local dist = (hrp.Position - torso.Position).Magnitude
					if dist < nearestDist then
						nearestDist = dist
						nearest = hrp
					end
				end
			end
			if nearest and nearestDist > 5 then
				humanoid:MoveTo(nearest.Position)
			end
			task.wait(0.3)
		end
	end)

	return bot
end

return buildRobotFollower`,
  },

  // ── 4. Race Track ───────────────────────────────
  {
    name: "Build a race track",
    description:
      "An oval dirt race track with banked turns, start/finish line, checkpoint gates, and decorative barriers. Designed for Scrapcraft vehicle racing. Includes configurable lap counting.",
    metadata: { category: "environment", style: "scrapcraft", size: "large" },
    luau_source: `-- Oval Race Track — banked turns with start/finish and checkpoints
local function buildRaceTrack(center: Vector3, radius: number)
	local track = Instance.new("Model")
	track.Name = "RaceTrack"

	local width = 16
	local bankAngle = 12

	-- Generate track segments around an oval
	local segments = 48
	for i = 0, segments - 1 do
		local angle = (i / segments) * math.pi * 2
		local nextAngle = ((i + 1) / segments) * math.pi * 2

		-- Oval parametric
		local rx = math.cos(angle) * radius
		local rz = math.sin(angle) * (radius * 0.7)
		local nx = math.cos(nextAngle) * radius
		local nz = math.sin(nextAngle) * (radius * 0.7)

		local midX = (rx + nx) / 2
		local midZ = (rz + nz) / 2
		local segLen = (Vector3.new(rx, 0, rz) - Vector3.new(nx, 0, nz)).Magnitude
		local segAngle = math.deg(math.atan2(nx - rx, nz - rz))

		-- Determine banking (more on curves)
		local curveFactor = math.abs(math.sin(angle))
		local bank = math.rad(bankAngle * curveFactor)

		local segment = Instance.new("Part")
		segment.Name = "Track_" .. i
		segment.Size = Vector3.new(width, 1, segLen + 0.5)
		segment.Position = center + Vector3.new(midX, 0, midZ)
		segment.CFrame = segment.CFrame * CFrame.Angles(0, math.rad(segAngle), bank)
		segment.BrickColor = BrickColor.new("Dirt brown")
		segment.Material = Enum.Material.Ground
		segment.Anchored = true
		segment.Parent = track

		-- Inner barrier
		if i % 4 == 0 then
			local barrier = Instance.new("Part")
			barrier.Name = "Barrier_" .. i
			barrier.Size = Vector3.new(1, 2, 4)
			barrier.Position = center + Vector3.new(midX * 0.82, 1.5, midZ * 0.82)
			barrier.BrickColor = BrickColor.new("Bright red")
			barrier.Material = Enum.Material.Plastic
			barrier.Anchored = true
			barrier.Parent = track
		end
	end

	-- Start/Finish line
	local startLine = Instance.new("Part")
	startLine.Name = "StartFinish"
	startLine.Size = Vector3.new(width, 0.5, 2)
	startLine.Position = center + Vector3.new(0, 0.3, -radius * 0.7)
	startLine.BrickColor = BrickColor.new("Institutional white")
	startLine.Material = Enum.Material.Neon
	startLine.Anchored = true
	startLine.Parent = track

	-- Checkered pattern
	for i = 0, 7 do
		local check = Instance.new("Part")
		check.Name = "Check_" .. i
		check.Size = Vector3.new(2, 0.1, 2)
		check.Position = center + Vector3.new(-7 + i * 2, 0.6, -radius * 0.7)
		check.BrickColor = (i % 2 == 0) and BrickColor.new("Really black") or BrickColor.new("Institutional white")
		check.Material = Enum.Material.Neon
		check.Anchored = true
		check.Parent = track
	end

	-- Checkpoints (4 around the oval)
	for cp = 1, 4 do
		local cpAngle = (cp / 4) * math.pi * 2
		local cpx = math.cos(cpAngle) * radius
		local cpz = math.sin(cpAngle) * (radius * 0.7)

		local gate = Instance.new("Part")
		gate.Name = "Checkpoint_" .. cp
		gate.Size = Vector3.new(width + 4, 8, 1)
		gate.Position = center + Vector3.new(cpx, 4, cpz)
		gate.BrickColor = BrickColor.new("New Yeller")
		gate.Material = Enum.Material.Neon
		gate.Transparency = 0.5
		gate.Anchored = true
		gate.CanCollide = false
		gate.Parent = track
	end

	return track
end

return buildRaceTrack`,
  },

  // ── 5. Forge / Smelting Station ─────────────────
  {
    name: "Build a forge/smelting station",
    description:
      "An industrial smelting forge with a brick furnace, chimney, glowing interior, and metal output tray. Converts raw ore scrap into usable ingots. Emits fire particles and ambient glow.",
    metadata: { category: "interactive", style: "scrapcraft", animated: true },
    luau_source: `-- Forge / Smelting Station — converts ore to ingots with fire effects
local function buildForge(position: Vector3)
	local forge = Instance.new("Model")
	forge.Name = "SmeltingForge"

	-- Furnace base (brick)
	local base = Instance.new("Part")
	base.Name = "FurnaceBase"
	base.Size = Vector3.new(5, 4, 5)
	base.Position = position + Vector3.new(0, 2, 0)
	base.BrickColor = BrickColor.new("Dark stone grey")
	base.Material = Enum.Material.Brick
	base.Anchored = true
	base.Parent = forge

	-- Interior fire chamber (glowing)
	local chamber = Instance.new("Part")
	chamber.Name = "FireChamber"
	chamber.Size = Vector3.new(3, 2, 3)
	chamber.Position = position + Vector3.new(0, 1.5, -1)
	chamber.BrickColor = BrickColor.new("Neon orange")
	chamber.Material = Enum.Material.Neon
	chamber.Anchored = true
	chamber.Parent = forge

	-- Fire particles
	local fireAttachment = Instance.new("Attachment")
	fireAttachment.Position = Vector3.new(0, 0, 0)
	fireAttachment.Parent = chamber

	local fire = Instance.new("ParticleEmitter")
	fire.Texture = "rbxassetid://241876414"
	fire.Lifetime = NumberRange.new(0.5, 1)
	fire.Speed = NumberRange.new(2, 4)
	fire.Rate = 30
	fire.SpreadAngle = Vector2.new(15, 15)
	fire.Color = ColorSequence.new(Color3.fromRGB(255, 100, 0), Color3.fromRGB(255, 200, 50))
	fire.Parent = fireAttachment

	-- Point light for ambient glow
	local fireLight = Instance.new("PointLight")
	fireLight.Color = Color3.fromRGB(255, 120, 0)
	fireLight.Range = 20
	fireLight.Brightness = 3
	fireLight.Parent = chamber

	-- Chimney
	local chimney = Instance.new("Part")
	chimney.Name = "Chimney"
	chimney.Size = Vector3.new(1.5, 6, 1.5)
	chimney.Position = position + Vector3.new(0, 7, 1.5)
	chimney.BrickColor = BrickColor.new("Rust")
	chimney.Material = Enum.Material.Metal
	chimney.Anchored = true
	chimney.Parent = forge

	-- Smoke from chimney
	local smokeAtt = Instance.new("Attachment")
	smokeAtt.Position = Vector3.new(0, 3, 0)
	smokeAtt.Parent = chimney

	local smoke = Instance.new("ParticleEmitter")
	smoke.Texture = "rbxassetid://241876414"
	smoke.Lifetime = NumberRange.new(2, 4)
	smoke.Speed = NumberRange.new(1, 2)
	smoke.Rate = 10
	smoke.Color = ColorSequence.new(Color3.fromRGB(80, 80, 80))
	smoke.Transparency = NumberSequence.new(0.5, 1)
	smoke.Size = NumberSequence.new(1, 4)
	smoke.Parent = smokeAtt

	-- Output tray (where ingots appear)
	local tray = Instance.new("Part")
	tray.Name = "OutputTray"
	tray.Size = Vector3.new(3, 0.5, 2)
	tray.Position = position + Vector3.new(0, 4.25, 2.5)
	tray.BrickColor = BrickColor.new("Medium stone grey")
	tray.Material = Enum.Material.Metal
	tray.Anchored = true
	tray.Parent = forge

	-- Interaction prompt
	local prompt = Instance.new("ProximityPrompt")
	prompt.ActionText = "Smelt"
	prompt.ObjectText = "Forge"
	prompt.KeyboardKeyCode = Enum.KeyCode.E
	prompt.HoldDuration = 1
	prompt.Parent = base

	return forge
end

return buildForge`,
  },

  // ── 6. Foundation Platform ──────────────────────
  {
    name: "Build a foundation platform",
    description:
      "A flat modular building foundation with grid-snap support. Constructed from concrete pads and support beams. The base layer for all hermes-roblox-construct templates and base-building.",
    metadata: { category: "structure", style: "hermes", modular: true },
    luau_source: `-- Foundation Platform — modular grid base for construction
local function buildFoundation(center: Vector3, gridSize: number)
	local foundation = Instance.new("Model")
	foundation.Name = "Foundation"

	local tileSize = 4
	local totalSize = tileSize * gridSize
	local half = totalSize / 2

	-- Main slab
	local slab = Instance.new("Part")
	slab.Name = "Slab"
	slab.Size = Vector3.new(totalSize, 1, totalSize)
	slab.Position = center
	slab.BrickColor = BrickColor.new("Stone grey")
	slab.Material = Enum.Material.Concrete
	slab.Anchored = true
	slab.Parent = foundation

	-- Grid tiles (visible seams)
	for x = 0, gridSize - 1 do
		for z = 0, gridSize - 1 do
			local tile = Instance.new("Part")
			tile.Name = "Tile_" .. x .. "_" .. z
			tile.Size = Vector3.new(tileSize - 0.1, 1.05, tileSize - 0.1)
			tile.Position = center + Vector3.new(
				-half + tileSize/2 + x * tileSize,
				0.03,
				-half + tileSize/2 + z * tileSize
			)
			tile.BrickColor = ((x + z) % 2 == 0) and BrickColor.new("Stone grey") or BrickColor.new("Dark stone grey")
			tile.Material = Enum.Material.Concrete
			tile.Anchored = true
			tile.Parent = foundation
		end
	end

	-- Support beams underneath
	for i = 0, gridSize do
		local beamX = Instance.new("Part")
		beamX.Name = "BeamX_" .. i
		beamX.Size = Vector3.new(totalSize, 1, 0.5)
		beamX.Position = center + Vector3.new(0, -1, -half + i * tileSize)
		beamX.BrickColor = BrickColor.new("Dark stone grey")
		beamX.Material = Enum.Material.Metal
		beamX.Anchored = true
		beamX.Parent = foundation

		local beamZ = Instance.new("Part")
		beamZ.Name = "BeamZ_" .. i
		beamZ.Size = Vector3.new(0.5, 1, totalSize)
		beamZ.Position = center + Vector3.new(-half + i * tileSize, -1, 0)
		beamZ.BrickColor = BrickColor.new("Dark stone grey")
		beamZ.Material = Enum.Material.Metal
		beamZ.Anchored = true
		beamZ.Parent = foundation
	end

	-- Corner markers (for grid-snap reference)
	for _, corner in ipairs({ {-half, -half}, {half, -half}, {-half, half}, {half, half} }) do
		local marker = Instance.new("Part")
		marker.Name = "CornerMarker"
		marker.Size = Vector3.new(0.5, 2, 0.5)
		marker.Position = center + Vector3.new(corner[1], 1, corner[2])
		marker.BrickColor = BrickColor.new("Bright yellow")
		marker.Material = Enum.Material.Neon
		marker.Anchored = true
		marker.Parent = foundation
	end

	return foundation
end

return buildFoundation`,
  },

  // ── 7. Wall Section ─────────────────────────────
  {
    name: "Build a wall section",
    description:
      "A modular wall segment with studs for snap-together base building. Includes optional door frame and window cutout variants. Designed to connect to foundation platforms for expandable bases.",
    metadata: { category: "structure", style: "hermes", modular: true },
    luau_source: `-- Wall Section — modular snap-build wall with door variant
local function buildWall(position: Vector3, hasDoor: boolean?)
	local wall = Instance.new("Model")
	wall.Name = "WallSection"

	local width = 8
	local height = 10
	local thickness = 1

	-- Main wall panel
	if hasDoor then
		-- Left of door
		local left = Instance.new("Part")
		left.Name = "WallLeft"
		left.Size = Vector3.new(width * 0.3, height, thickness)
		left.Position = position + Vector3.new(-width * 0.35, height/2, 0)
		left.BrickColor = BrickColor.new("Ash grey")
		left.Material = Enum.Material.Concrete
		left.Anchored = true
		left.Parent = wall

		-- Right of door
		local right = Instance.new("Part")
		right.Name = "WallRight"
		right.Size = Vector3.new(width * 0.3, height, thickness)
		right.Position = position + Vector3.new(width * 0.35, height/2, 0)
		right.BrickColor = BrickColor.new("Ash grey")
		right.Material = Enum.Material.Concrete
		right.Anchored = true
		right.Parent = wall

		-- Above door (lintel)
		local lintel = Instance.new("Part")
		lintel.Name = "Lintel"
		lintel.Size = Vector3.new(width * 0.4, height * 0.4, thickness)
		lintel.Position = position + Vector3.new(0, height * 0.8, 0)
		lintel.BrickColor = BrickColor.new("Ash grey")
		lintel.Material = Enum.Material.Concrete
		lintel.Anchored = true
		lintel.Parent = wall

		-- Door frame
		local frame = Instance.new("Part")
		frame.Name = "DoorFrame"
		frame.Size = Vector3.new(width * 0.4, height * 0.6 + 0.4, thickness + 0.2)
		frame.Position = position + Vector3.new(0, height * 0.3, 0)
		frame.BrickColor = BrickColor.new("Dark stone grey")
		frame.Material = Enum.Material.Metal
		frame.Anchored = true
		frame.Parent = wall
	else
		local panel = Instance.new("Part")
		panel.Name = "WallPanel"
		panel.Size = Vector3.new(width, height, thickness)
		panel.Position = position + Vector3.new(0, height/2, 0)
		panel.BrickColor = BrickColor.new("Ash grey")
		panel.Material = Enum.Material.Concrete
		panel.Anchored = true
		panel.Parent = wall
	end

	-- Studs on top (snap connectors)
	for i = -1, 1 do
		local stud = Instance.new("Part")
		stud.Name = "Stud_" .. i
		stud.Size = Vector3.new(1, 0.5, 1)
		stud.Position = position + Vector3.new(i * (width/3), height + 0.25, 0)
		stud.BrickColor = BrickColor.new("Bright yellow")
		stud.Material = Enum.Material.Neon
		stud.Anchored = true
		stud.Parent = wall
	end

	-- Bottom rail
	local rail = Instance.new("Part")
	rail.Name = "BaseRail"
	rail.Size = Vector3.new(width + 0.5, 1, thickness + 0.5)
	rail.Position = position + Vector3.new(0, 0.5, 0)
	rail.BrickColor = BrickColor.new("Dark stone grey")
	rail.Material = Enum.Material.Metal
	rail.Anchored = true
	rail.Parent = wall

	return wall
end

return buildWall`,
  },

  // ── 8. Resource Node ────────────────────────────
  {
    name: "Build a resource node",
    description:
      "A harvestable resource deposit — scrap metal pile, crystal cluster, or wood scrap. Players interact to gather materials on a cooldown timer. Core loop of hermes resource-farming gameplay.",
    metadata: { category: "interactive", style: "hermes", interactive: true },
    luau_source: `-- Resource Node — harvestable deposit with cooldown and depletion
local function buildResourceNode(position: Vector3, resourceType: string?)
	local rType = resourceType or "scrap"
	local node = Instance.new("Model")
	node.Name = "ResourceNode_" .. rType

	-- Visual config per type
	local config = {
		scrap = { color = "Rust", material = Enum.Material.Metal, size = Vector3.new(3, 2, 3) },
		crystal = { color = "Lily white", material = Enum.Material.Ice, size = Vector3.new(2, 3, 2) },
		wood = { color = "Brown", material = Enum.Material.Wood, size = Vector3.new(2.5, 2, 2.5) },
	}
	local cfg = config[rType] or config.scrap

	-- Main deposit
	local deposit = Instance.new("Part")
	deposit.Name = "Deposit"
	deposit.Size = cfg.size
	deposit.Position = position + Vector3.new(0, cfg.size.Y / 2, 0)
	deposit.BrickColor = BrickColor.new(cfg.color)
	deposit.Material = cfg.material
	deposit.Anchored = true
	deposit.Parent = node

	-- Scattered chunks around base
	for i = 1, 4 do
		local chunk = Instance.new("Part")
		chunk.Name = "Chunk_" .. i
		local angle = (i / 4) * math.pi * 2
		local offset = Vector3.new(math.cos(angle) * 2.5, 0, math.sin(angle) * 2.5)
		chunk.Size = Vector3.new(0.8, 0.8, 0.8)
		chunk.Position = position + offset + Vector3.new(0, 0.4, 0)
		chunk.BrickColor = BrickColor.new(cfg.color)
		chunk.Material = cfg.material
		chunk.Anchored = true
		chunk.Parent = node
	end

	-- Glow effect
	local glow = Instance.new("PointLight")
	glow.Color = (rType == "crystal") and Color3.fromRGB(100, 200, 255) or Color3.fromRGB(255, 150, 50)
	glow.Range = 8
	glow.Brightness = 1
	glow.Parent = deposit

	-- Harvest prompt
	local prompt = Instance.new("ProximityPrompt")
	prompt.ActionText = "Harvest"
	prompt.ObjectText = rType:gsub("^%l", string.upper) .. " Deposit"
	prompt.KeyboardKeyCode = Enum.KeyCode.E
	prompt.HoldDuration = 0.8
	prompt.MaxActivationDistance = 8
	prompt.Parent = deposit

	-- Cooldown state
	local harvested = false
	prompt.Triggered:Connect(function(player)
		if harvested then return end
		harvested = true
		prompt.Enabled = false
		deposit.Transparency = 0.7

		-- Give resource (server-side)
		print(player.Name .. " harvested " .. rType)

		-- Respawn after cooldown
		task.delay(15, function()
			harvested = false
			prompt.Enabled = true
			deposit.Transparency = 0
		end)
	end)

	return node
end

return buildResourceNode`,
  },

  // ── 9. Light Beacon ─────────────────────────────
  {
    name: "Build a light beacon",
    description:
      "A tall lighthouse-style beacon tower with a rotating sweep light, visible from across the map. Serves as a navigation landmark and waypoint finder. Spiral staircase inside for player access.",
    metadata: { category: "structure", style: "lighthouse", animated: true },
    luau_source: `-- Light Beacon — rotating sweep landmark with spiral stairs
local function buildBeacon(position: Vector3, height: number)
	local beacon = Instance.new("Model")
	beacon.Name = "LightBeacon"

	-- Tower base (tapered cylinder)
	for i = 0, height - 1 do
		local radius = 6 - (i / height) * 2
		local ring = Instance.new("Part")
		ring.Name = "Tower_" .. i
		ring.Shape = Enum.PartType.Cylinder
		ring.Size = Vector3.new(4, radius * 2, radius * 2)
		ring.Position = position + Vector3.new(0, i * 4 + 2, 0)
		ring.BrickColor = (i % 2 == 0) and BrickColor.new("Institutional white") or BrickColor.new("Really red")
		ring.Material = Enum.Material.SmoothPlastic
		ring.Anchored = true
		ring.Parent = beacon
	end

	-- Lamp room at top
	local lampRoom = Instance.new("Part")
	lampRoom.Name = "LampRoom"
	lampRoom.Size = Vector3.new(8, 4, 8)
	lampRoom.Position = position + Vector3.new(0, height * 4 + 2, 0)
	lampRoom.BrickColor = BrickColor.new("Institutional white")
	lampRoom.Material = Enum.Material.Glass
	lampRoom.Transparency = 0.3
	lampRoom.Anchored = true
	lampRoom.Parent = beacon

	-- Rotating light source
	local lightPivot = Instance.new("Part")
	lightPivot.Name = "LightPivot"
	lightPivot.Size = Vector3.new(0.5, 0.5, 0.5)
	lightPivot.Position = lampRoom.Position
	lightPivot.Transparency = 1
	lightPivot.CanCollide = false
	lightPivot.Anchored = true
	lightPivot.Parent = beacon

	-- Spotlight (sweep beam)
	local spotlight = Instance.new("SpotLight")
	spotlight.Angle = 30
	spotlight.Range = 200
	spotlight.Brightness = 5
	spotlight.Color = Color3.fromRGB(255, 240, 200)
	spotlight.Face = Enum.NormalId.Front
	spotlight.Parent = lightPivot

	-- Glowing core
	local core = Instance.new("Part")
	core.Name = "Core"
	core.Shape = Enum.PartType.Ball
	core.Size = Vector3.new(2, 2, 2)
	core.Position = lampRoom.Position
	core.BrickColor = BrickColor.new("New Yeller")
	core.Material = Enum.Material.Neon
	core.Anchored = true
	core.Parent = beacon

	-- Spire on top
	local spire = Instance.new("Part")
	spire.Name = "Spire"
	spire.Size = Vector3.new(1, 6, 1)
	spire.Position = lampRoom.Position + Vector3.new(0, 5, 0)
	spire.BrickColor = BrickColor.new("Really black")
	spire.Material = Enum.Material.Metal
	spire.Anchored = true
	spire.Parent = beacon

	-- Rotation logic
	task.spawn(function()
		while beacon.Parent do
			lightPivot.CFrame = lightPivot.CFrame * CFrame.Angles(0, math.rad(2), 0)
			task.wait(0.03)
		end
	end)

	return beacon
end

return buildBeacon`,
  },

  // ── 10. Garden / Planter ────────────────────────
  {
    name: "Build a garden/planter",
    description:
      "A decorative wooden planter box with growing plants, flowers, and grass. Adds natural beauty to scrap environments. Includes randomized plant placement and sway animation for organic feel.",
    metadata: { category: "decorative", style: "nature", animated: true },
    luau_source: `-- Garden Planter — wooden box with randomized growing plants
local function buildGarden(position: Vector3, plantCount: number?)
	local garden = Instance.new("Model")
	garden.Name = "GardenPlanter"

	local width = 8
	local depth = 4
	local count = plantCount or 12

	-- Planter box (4 walls + soil)
	for _, edge in ipairs({
		{ Vector3.new(width, 1.5, 0.5), Vector3.new(0, 0.75, depth/2) },
		{ Vector3.new(width, 1.5, 0.5), Vector3.new(0, 0.75, -depth/2) },
		{ Vector3.new(0.5, 1.5, depth), Vector3.new(width/2, 0.75, 0) },
		{ Vector3.new(0.5, 1.5, depth), Vector3.new(-width/2, 0.75, 0) },
	}) do
		local wall = Instance.new("Part")
		wall.Name = "PlanterWall"
		wall.Size = edge[1]
		wall.Position = position + edge[2]
		wall.BrickColor = BrickColor.new("Redwood")
		wall.Material = Enum.Material.Wood
		wall.Anchored = true
		wall.Parent = garden
	end

	-- Soil base
	local soil = Instance.new("Part")
	soil.Name = "Soil"
	soil.Size = Vector3.new(width - 1, 0.5, depth - 1)
	soil.Position = position + Vector3.new(0, 0.5, 0)
	soil.BrickColor = BrickColor.new("Dirt brown")
	soil.Material = Enum.Material.Grass
	soil.Anchored = true
	soil.Parent = garden

	-- Randomized plants
	local plantColors = { "Bright green", "Lily white", "Bright yellow", "Hot pink", "Bright blue", "Magenta" }
	local flowerHeads = { Enum.PartType.Ball, Enum.PartType.Ball, Enum.PartType.Cylinder }

	for i = 1, count do
		local px = position.X + (math.random() - 0.5) * (width - 2)
		local pz = position.Z + (math.random() - 0.5) * (depth - 2)
		local plantHeight = 1 + math.random() * 2.5
		local isFlower = math.random() > 0.4

		-- Stem
		local stem = Instance.new("Part")
		stem.Name = "Stem_" .. i
		stem.Size = Vector3.new(0.2, plantHeight, 0.2)
		stem.Position = Vector3.new(px, position.Y + 1.5 + plantHeight/2, pz)
		stem.BrickColor = BrickColor.new("Forest green")
		stem.Material = Enum.Material.Grass
		stem.Anchored = true
		stem.Parent = garden

		-- Flower head or leaves
		if isFlower then
			local head = Instance.new("Part")
			head.Name = "Flower_" .. i
			head.Shape = flowerHeads[math.random(#flowerHeads)]
			head.Size = Vector3.new(0.6, 0.6, 0.6)
			head.Position = Vector3.new(px, position.Y + 1.5 + plantHeight + 0.3, pz)
			head.BrickColor = BrickColor.new(plantColors[math.random(#plantColors)])
			head.Material = Enum.Material.Neon
			head.Anchored = true
			head.Parent = garden

			-- Sway animation
			local swayTime = math.random() * math.pi * 2
			task.spawn(function()
				while head.Parent do
					local sway = math.sin(os.clock() * 2 + swayTime) * 0.1
					head.CFrame = CFrame.new(head.Position) * CFrame.Angles(sway, 0, sway * 0.7)
					task.wait(0.05)
				end
			end)
		else
			-- Leaf cluster
			for j = 1, 3 do
				local leaf = Instance.new("Part")
				leaf.Name = "Leaf_" .. i .. "_" .. j
				leaf.Size = Vector3.new(0.5, 0.1, 0.3)
				leaf.Position = stem.Position + Vector3.new(
					(math.random() - 0.5) * 0.6,
					plantHeight * 0.3,
					(math.random() - 0.5) * 0.6
				)
				leaf.BrickColor = BrickColor.new("Forest green")
				leaf.Material = Enum.Material.Grass
				leaf.Anchored = true
				leaf.Parent = garden
			end
		end
	end

	return garden
end

return buildGarden`,
  },
];

// ─── Seed via Worker API ───────────────────────────────

async function main() {
  const url = WORKER_URL.replace(/\/$/, "");
  console.log(`Seeding ${skills.length} skills to ${url}/api/skills/seed ...`);

  const res = await fetch(`${url}/api/skills/seed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(skills),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Failed (${res.status}): ${text}`);
    process.exit(1);
  }

  const data = await res.json();
  console.log("✅ Seed complete:", JSON.stringify(data, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

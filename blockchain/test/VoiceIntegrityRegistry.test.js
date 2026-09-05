const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VoiceIntegrityRegistry", function () {
  let registry;
  let owner, user1, user2;

  // Test data
  const evidenceHash = ethers.keccak256(ethers.toUtf8Bytes("test-evidence-manifest-v1"));
  const recordId = ethers.keccak256(ethers.toUtf8Bytes("INC-TEST-001"));
  const createdAt = Math.floor(Date.now() / 1000);

  const evidenceHash2 = ethers.keccak256(ethers.toUtf8Bytes("test-evidence-manifest-v2"));
  const recordId2 = ethers.keccak256(ethers.toUtf8Bytes("INC-TEST-002"));

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("VoiceIntegrityRegistry");
    registry = await Registry.deploy();
  });

  describe("Registration", function () {
    it("should register evidence successfully", async function () {
      await registry.registerEvidence(evidenceHash, recordId, createdAt);

      const [storedHash, storedTime, registrar] = await registry.getEvidence(recordId);
      expect(storedHash).to.equal(evidenceHash);
      expect(storedTime).to.equal(createdAt);
      expect(registrar).to.equal(owner.address);
    });

    it("should emit EvidenceRegistered event", async function () {
      await expect(registry.registerEvidence(evidenceHash, recordId, createdAt))
        .to.emit(registry, "EvidenceRegistered")
        .withArgs(recordId, evidenceHash, createdAt, owner.address);
    });

    it("should reject zero evidence hash", async function () {
      await expect(
        registry.registerEvidence(ethers.ZeroHash, recordId, createdAt)
      ).to.be.revertedWith("Evidence hash cannot be zero");
    });

    it("should reject zero record ID", async function () {
      await expect(
        registry.registerEvidence(evidenceHash, ethers.ZeroHash, createdAt)
      ).to.be.revertedWith("Record ID cannot be zero");
    });

    it("should reject duplicate record ID", async function () {
      await registry.registerEvidence(evidenceHash, recordId, createdAt);
      await expect(
        registry.registerEvidence(evidenceHash2, recordId, createdAt)
      ).to.be.revertedWith("Record already exists");
    });

    it("should allow registering multiple different records", async function () {
      await registry.registerEvidence(evidenceHash, recordId, createdAt);
      await registry.registerEvidence(evidenceHash2, recordId2, createdAt);

      const [hash1] = await registry.getEvidence(recordId);
      const [hash2] = await registry.getEvidence(recordId2);
      expect(hash1).to.equal(evidenceHash);
      expect(hash2).to.equal(evidenceHash2);
    });
  });

  describe("Verification", function () {
    beforeEach(async function () {
      await registry.registerEvidence(evidenceHash, recordId, createdAt);
    });

    it("should verify matching hash", async function () {
      const valid = await registry.verifyEvidence(recordId, evidenceHash);
      expect(valid).to.be.true;
    });

    it("should reject non-matching hash", async function () {
      const valid = await registry.verifyEvidence(recordId, evidenceHash2);
      expect(valid).to.be.false;
    });

    it("should return false for non-existent record", async function () {
      const fakeRecordId = ethers.keccak256(ethers.toUtf8Bytes("FAKE"));
      const valid = await registry.verifyEvidence(fakeRecordId, evidenceHash);
      expect(valid).to.be.false;
    });
  });

  describe("Record existence", function () {
    it("should return true for existing record", async function () {
      await registry.registerEvidence(evidenceHash, recordId, createdAt);
      expect(await registry.recordExists(recordId)).to.be.true;
    });

    it("should return false for non-existing record", async function () {
      const fakeRecordId = ethers.keccak256(ethers.toUtf8Bytes("FAKE"));
      expect(await registry.recordExists(fakeRecordId)).to.be.false;
    });
  });

  describe("Access control", function () {
    it("should allow any address to register", async function () {
      await registry.connect(user1).registerEvidence(evidenceHash, recordId, createdAt);
      const [, , registrar] = await registry.getEvidence(recordId);
      expect(registrar).to.equal(user1.address);
    });

    it("should allow any address to verify", async function () {
      await registry.registerEvidence(evidenceHash, recordId, createdAt);
      const valid = await registry.connect(user2).verifyEvidence(recordId, evidenceHash);
      expect(valid).to.be.true;
    });
  });
});

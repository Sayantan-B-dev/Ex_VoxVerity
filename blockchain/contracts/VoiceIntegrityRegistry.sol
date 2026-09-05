// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title VoiceIntegrityRegistry
 * @notice On-chain evidence registry for VoxVerity voice integrity proofs.
 * @dev Stores evidence hashes and minimal metadata on Polygon Amoy testnet.
 *      Never stores raw audio, embeddings, or personal data on-chain.
 */
contract VoiceIntegrityRegistry {
    struct Evidence {
        bytes32 evidenceHash;
        bytes32 recordId;
        uint64 createdAt;
        address registrar;
        bool exists;
    }

    // Record ID => Evidence
    mapping(bytes32 => Evidence) public evidenceRegistry;

    // Event emitted when evidence is registered
    event EvidenceRegistered(
        bytes32 indexed recordId,
        bytes32 evidenceHash,
        uint64 createdAt,
        address registrar
    );

    // Event emitted when evidence is verified
    event EvidenceVerified(
        bytes32 indexed recordId,
        bool valid,
        address verifier
    );

    /**
     * @notice Register an evidence hash on-chain.
     * @param evidenceHash SHA-256 hash of the canonical evidence manifest.
     * @param recordId Unique identifier for the evidence record.
     * @param createdAt Timestamp when the evidence was created.
     */
    function registerEvidence(
        bytes32 evidenceHash,
        bytes32 recordId,
        uint64 createdAt
    ) external {
        require(evidenceHash != bytes32(0), "Evidence hash cannot be zero");
        require(recordId != bytes32(0), "Record ID cannot be zero");
        require(!evidenceRegistry[recordId].exists, "Record already exists");

        evidenceRegistry[recordId] = Evidence({
            evidenceHash: evidenceHash,
            recordId: recordId,
            createdAt: createdAt,
            registrar: msg.sender,
            exists: true
        });

        emit EvidenceRegistered(recordId, evidenceHash, createdAt, msg.sender);
    }

    /**
     * @notice Get evidence details by record ID.
     * @param recordId The unique record identifier.
     * @return evidenceHash The stored evidence hash.
     * @return createdAt The creation timestamp.
     * @return registrar The address that registered the evidence.
     */
    function getEvidence(bytes32 recordId)
        external
        view
        returns (
            bytes32 evidenceHash,
            uint64 createdAt,
            address registrar
        )
    {
        Evidence storage e = evidenceRegistry[recordId];
        require(e.exists, "Evidence not found");
        return (e.evidenceHash, e.createdAt, e.registrar);
    }

    /**
     * @notice Verify that a record's hash matches the expected value.
     * @param recordId The unique record identifier.
     * @param expectedHash The expected evidence hash to compare against.
     * @return valid True if the stored hash matches the expected hash.
     */
    function verifyEvidence(bytes32 recordId, bytes32 expectedHash)
        external
        view
        returns (bool valid)
    {
        Evidence storage e = evidenceRegistry[recordId];
        if (!e.exists) return false;
        valid = (e.evidenceHash == expectedHash);
        return valid;
    }

    /**
     * @notice Check if a record exists.
     * @param recordId The unique record identifier.
     * @return True if the record exists.
     */
    function recordExists(bytes32 recordId) external view returns (bool) {
        return evidenceRegistry[recordId].exists;
    }
}

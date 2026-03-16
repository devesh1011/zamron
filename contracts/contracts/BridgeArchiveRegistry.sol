// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

contract BridgeArchiveRegistry {
    enum OperationType {
        Bridge,
        Send,
        Unwrap
    }

    struct ReceiptRecord {
        uint256 id;
        address owner;
        OperationType operationType;
        string pieceCid;
        uint256 dataSetId;
        bytes32 receiptHash;
        uint256 createdAt;
    }

    uint256 private _nextRecordId = 1;
    mapping(uint256 => ReceiptRecord) private _records;
    mapping(address => uint256[]) private _ownerRecordIds;

    event RecordSaved(
        uint256 indexed id,
        address indexed owner,
        OperationType indexed operationType,
        string pieceCid,
        uint256 dataSetId,
        bytes32 receiptHash
    );

    error InvalidPieceCid();

    function saveRecord(
        OperationType operationType,
        string calldata pieceCid,
        uint256 dataSetId,
        bytes32 receiptHash
    ) external returns (uint256 id) {
        if (bytes(pieceCid).length == 0) {
            revert InvalidPieceCid();
        }

        id = _nextRecordId++;
        _records[id] = ReceiptRecord({
            id: id,
            owner: msg.sender,
            operationType: operationType,
            pieceCid: pieceCid,
            dataSetId: dataSetId,
            receiptHash: receiptHash,
            createdAt: block.timestamp
        });
        _ownerRecordIds[msg.sender].push(id);

        emit RecordSaved(id, msg.sender, operationType, pieceCid, dataSetId, receiptHash);
    }

    function getRecord(uint256 id) external view returns (ReceiptRecord memory) {
        return _records[id];
    }

    function getRecordsByOwner(address owner) external view returns (ReceiptRecord[] memory records) {
        uint256[] storage ids = _ownerRecordIds[owner];
        records = new ReceiptRecord[](ids.length);

        for (uint256 i = 0; i < ids.length; i++) {
          records[i] = _records[ids[i]];
        }
    }

    function getRecordIdsByOwner(address owner) external view returns (uint256[] memory) {
        return _ownerRecordIds[owner];
    }
}

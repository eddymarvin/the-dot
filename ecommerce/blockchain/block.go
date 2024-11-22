package blockchain

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"time"
)

type Block struct {
	Timestamp int64     `json:"timestamp"`
	Data      OrderData `json:"data"`
	PrevHash  string    `json:"prev_hash"`
	Hash      string    `json:"hash"`
}

type OrderData struct {
	OrderID     string    `json:"order_id"`
	UserID      string    `json:"user_id"`
	ProductIDs  []string  `json:"product_ids"`
	TotalAmount float64   `json:"total_amount"`
	Status      string    `json:"status"`
	CreatedAt   time.Time `json:"created_at"`
}

func NewBlock(data OrderData, prevHash string) *Block {
	block := &Block{
		Timestamp: time.Now().Unix(),
		Data:      data,
		PrevHash:  prevHash,
	}
	block.Hash = block.calculateHash()
	return block
}

func (b *Block) calculateHash() string {
	data, _ := json.Marshal(b.Data)
	record := string(rune(b.Timestamp)) + string(data) + b.PrevHash
	h := sha256.New()
	h.Write([]byte(record))
	hashed := h.Sum(nil)
	return hex.EncodeToString(hashed)
}

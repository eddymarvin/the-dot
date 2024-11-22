package blockchain

import (
	"sync"
	"time"
)

type Blockchain struct {
	Blocks []*Block
	mu     sync.RWMutex
}

var (
	instance *Blockchain
	once     sync.Once
)

// GetInstance returns the singleton instance of the blockchain
func GetInstance() *Blockchain {
	once.Do(func() {
		instance = &Blockchain{
			Blocks: []*Block{genesisBlock()},
		}
	})
	return instance
}

func genesisBlock() *Block {
	return NewBlock(OrderData{
		OrderID:     "genesis",
		Status:      "completed",
		TotalAmount: 0,
		CreatedAt:   time.Now(),
	}, "0")
}

func (bc *Blockchain) AddBlock(data OrderData) *Block {
	bc.mu.Lock()
	defer bc.mu.Unlock()

	prevBlock := bc.Blocks[len(bc.Blocks)-1]
	newBlock := NewBlock(data, prevBlock.Hash)
	bc.Blocks = append(bc.Blocks, newBlock)
	return newBlock
}

func (bc *Blockchain) GetLastBlock() *Block {
	bc.mu.RLock()
	defer bc.mu.RUnlock()
	return bc.Blocks[len(bc.Blocks)-1]
}

func (bc *Blockchain) IsValid() bool {
	bc.mu.RLock()
	defer bc.mu.RUnlock()

	for i := 1; i < len(bc.Blocks); i++ {
		currentBlock := bc.Blocks[i]
		previousBlock := bc.Blocks[i-1]

		if currentBlock.Hash != currentBlock.calculateHash() {
			return false
		}

		if currentBlock.PrevHash != previousBlock.Hash {
			return false
		}
	}
	return true
}

func (bc *Blockchain) GetBlockByOrderID(orderID string) *Block {
	bc.mu.RLock()
	defer bc.mu.RUnlock()

	for _, block := range bc.Blocks {
		if block.Data.OrderID == orderID {
			return block
		}
	}
	return nil
}

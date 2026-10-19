package main

import (
	"fmt"
	"syscall"
)

func waitForOld(pid int) error {
	handle, err := syscall.OpenProcess(syscall.SYNCHRONIZE, false, uint32(pid))
	if err != nil {
		return nil
	}
	defer syscall.CloseHandle(handle)
	result, err := syscall.WaitForSingleObject(handle, 15000)
	if err != nil {
		return err
	}
	if result != syscall.WAIT_OBJECT_0 {
		return fmt.Errorf("previous game did not exit; old file preserved")
	}
	return nil
}

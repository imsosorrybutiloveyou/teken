//go:build !windows

package main

func waitForOld(pid int) error { return nil }

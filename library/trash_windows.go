//go:build windows

package library

import (
	"syscall"
	"unsafe"
)

var (
	shell32               = syscall.NewLazyDLL("shell32.dll")
	shFileOperationW      = shell32.NewProc("SHFileOperationW")
)

const (
	FO_DELETE = 0x0003
	FOF_ALLOWUNDO = 0x0040
	FOF_NOCONFIRMATION = 0x0010
	FOF_SILENT = 0x0004
)

type SHFILEOPSTRUCTW struct {
	Hwnd                  uintptr
	WFunc                 uint32
	PFrom                 *uint16
	PTo                   *uint16
	FFlags                uint16
	FAnyOperationsAborted int32
	HNameMappings         uintptr
	LpszProgressTitle     *uint16
}

// moveToTrash moves a file or directory to Windows Recycle Bin
func moveToTrash(path string) error {
	// Convert path to UTF-16 with double null termination
	pathUTF16, err := syscall.UTF16PtrFromString(path)
	if err != nil {
		return err
	}

	// Create double-null terminated string
	pathLen := 0
	for ; *(*uint16)(unsafe.Pointer(uintptr(unsafe.Pointer(pathUTF16)) + uintptr(pathLen*2))) != 0; pathLen++ {
	}
	doubleNullPath := make([]uint16, pathLen+2)
	for i := 0; i < pathLen; i++ {
		doubleNullPath[i] = *(*uint16)(unsafe.Pointer(uintptr(unsafe.Pointer(pathUTF16)) + uintptr(i*2)))
	}
	doubleNullPath[pathLen] = 0
	doubleNullPath[pathLen+1] = 0

	fileOp := SHFILEOPSTRUCTW{
		Hwnd:   0,
		WFunc:  FO_DELETE,
		PFrom:  &doubleNullPath[0],
		PTo:    nil,
		FFlags: FOF_ALLOWUNDO | FOF_NOCONFIRMATION | FOF_SILENT,
	}

	ret, _, _ := shFileOperationW.Call(uintptr(unsafe.Pointer(&fileOp)))
	if ret != 0 {
		return syscall.Errno(ret)
	}

	return nil
}


